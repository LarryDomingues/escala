import connectDB from '../../../lib/mongodb';
import Membro from '../../../lib/models/Membro';
import Usuario from '../../../lib/models/Usuario';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const membros = await Membro.find()
        .populate('usuario_id', 'nome email')
        .populate('habilidade_ids', 'nome')
        .sort({ nome: 1 });

      const result = membros.map(membro => ({
        id: membro._id,
        nome: membro.nome,
        celular: membro.celular,
        email: membro.email,
        data_nascimento: membro.data_nascimento,
        usuario_id: membro.usuario_id?._id || null,
        usuario_sistema: membro.usuario_id?.nome || 'Sem usuário',
        habilidades: membro.habilidade_ids?.map(h => h.nome).join(', ') || '',
        habilidade_ids: membro.habilidade_ids?.map(h => h._id.toString()) || [],
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      return res.status(500).json({ error: 'Erro ao buscar membros' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, celular, email, data_nascimento, habilidades } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      let usuario_id = null;
      if (email) {
        const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
        if (usuarioExistente) {
          usuario_id = usuarioExistente._id;
        } else {
          const senhaTemp = Math.random().toString(36).slice(-8);
          const novoUsuario = await Usuario.create({
            nome,
            email: email.toLowerCase(),
            senha: senhaTemp,
            status: 'ativo',
            nivel: 'membro',
          });
          usuario_id = novoUsuario._id;
        }
      }

      const membro = await Membro.create({
        usuario_id,
        nome,
        celular,
        email,
        data_nascimento,
        habilidade_ids: habilidades || [],
        criado_por: user.id,
      });

      await Log.create({
        usuario_id: user.id,
        acao: 'cadastro_membro',
        descricao: `Membro '${nome}' cadastrado por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(201).json({
        success: true,
        message: 'Membro cadastrado com sucesso!',
        membro: { id: membro._id, nome: membro.nome },
      });
    } catch (error) {
      console.error('Erro ao criar membro:', error);
      return res.status(500).json({ error: 'Erro ao criar membro' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}