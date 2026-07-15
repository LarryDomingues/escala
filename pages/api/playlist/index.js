// pages/api/playlist/index.js
import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Membro from '../../../lib/models/Membro';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function verificarSeEstaEscalado(escala, membroId) {
  const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
  return campos.some(campo => {
    const ref = escala[campo];
    return ref && ref._id && ref._id.toString() === membroId.toString();
  });
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { mes } = req.query;
      
      if (!mes) {
        return res.status(400).json({ error: 'Mês é obrigatório' });
      }

      const [ano, mesNum] = mes.split('-');
      const startDate = `${ano}-${mesNum}-01`;
      const lastDay = new Date(ano, parseInt(mesNum), 0).getDate();
      const endDate = `${ano}-${mesNum}-${String(lastDay).padStart(2, '0')}`;

      const escalas = await Escala.find({
        data: { $gte: startDate, $lte: endDate }
      })
      .populate('voz_id', 'nome')
      .populate('voz2_id', 'nome')
      .populate('violao_id', 'nome')
      .populate('guitarra_id', 'nome')
      .populate('baixo_id', 'nome')
      .populate('bateria_id', 'nome')
      .populate('teclado_id', 'nome')
      .sort({ data: 1 });

      let membroId = null;
      if (user.nivel !== 'admin') {
        const membro = await Membro.findOne({ usuario_id: user.id });
        membroId = membro?._id || null;
      }

      let escalasFiltradas = escalas;
      if (user.nivel !== 'admin' && membroId) {
        escalasFiltradas = escalas.filter(escala => verificarSeEstaEscalado(escala, membroId));
      } else if (user.nivel !== 'admin' && !membroId) {
        return res.status(200).json({ escalas: [], mensagem: 'Você não está vinculado a nenhum membro' });
      }

      const result = escalasFiltradas.map(escala => ({
        id: escala._id,
        data: escala.data,
        dia_semana: escala.dia_semana,
        voz_id: escala.voz_id?._id || null,
        voz_nome: escala.voz_id?.nome || null,
        voz2_id: escala.voz2_id?._id || null,
        voz2_nome: escala.voz2_id?.nome || null,
        violao_id: escala.violao_id?._id || null,
        violao_nome: escala.violao_id?.nome || null,
        guitarra_id: escala.guitarra_id?._id || null,
        guitarra_nome: escala.guitarra_id?.nome || null,
        baixo_id: escala.baixo_id?._id || null,
        baixo_nome: escala.baixo_id?.nome || null,
        bateria_id: escala.bateria_id?._id || null,
        bateria_nome: escala.bateria_id?.nome || null,
        teclado_id: escala.teclado_id?._id || null,
        teclado_nome: escala.teclado_id?.nome || null,
        link_youtube: escala.link_youtube || null,
        anotacao: escala.anotacao || null, // 🔥 ADICIONADO
        esta_escalado: membroId ? verificarSeEstaEscalado(escala, membroId) : false,
        pode_editar: user.nivel === 'admin' || (membroId && verificarSeEstaEscalado(escala, membroId)),
      }));

      return res.status(200).json({
        escalas: result,
        usuario: { id: user.id, nome: user.nome, nivel: user.nivel, membro_id: membroId },
      });
    } catch (error) {
      console.error('Erro ao buscar playlist:', error);
      return res.status(500).json({ error: 'Erro ao buscar playlist' });
    }
  }

  // POST - Salvar link do YouTube
  if (req.method === 'POST') {
    try {
      const { data, link_youtube } = req.body;

      if (!data) {
        return res.status(400).json({ error: 'Data é obrigatória' });
      }

      const escala = await Escala.findOne({ data });
      if (!escala) {
        return res.status(404).json({ error: 'Escala não encontrada para esta data' });
      }

      let podeEditar = user.nivel === 'admin';
      if (!podeEditar) {
        const membro = await Membro.findOne({ usuario_id: user.id });
        if (membro) {
          podeEditar = verificarSeEstaEscalado(escala, membro._id);
        }
      }

      if (!podeEditar) {
        return res.status(403).json({ error: 'Você não tem permissão para editar esta data' });
      }

      let youtubeLink = link_youtube;
      if (link_youtube) {
        const videoId = extractYoutubeId(link_youtube);
        if (videoId) {
          youtubeLink = `https://www.youtube.com/embed/${videoId}`;
        } else if (!link_youtube.includes('youtube.com') && !link_youtube.includes('youtu.be')) {
          return res.status(400).json({ error: 'Link do YouTube inválido' });
        }
      }

      escala.link_youtube = youtubeLink || null;
      escala.atualizado_por = user.id;
      escala.atualizado_em = new Date();
      await escala.save();

      await Log.create({
        usuario_id: user.id,
        acao: 'playlist',
        descricao: `${youtubeLink ? 'Adicionou' : 'Removeu'} link do YouTube para data ${data} por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: youtubeLink ? 'Link do YouTube adicionado com sucesso!' : 'Link do YouTube removido com sucesso!',
        link_youtube: youtubeLink,
      });
    } catch (error) {
      console.error('Erro ao salvar link do YouTube:', error);
      return res.status(500).json({ error: 'Erro ao salvar link do YouTube' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}