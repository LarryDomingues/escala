import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

function getDiaSemana(data) {
  const date = new Date(data + 'T00:00:00');
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return diasSemana[date.getDay()];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  try {
    await connectDB();

    const { data, escala } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    if (!escala || typeof escala !== 'object') {
      return res.status(400).json({ error: 'Dados da escala inválidos' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: 'Formato de data inválido' });
    }

    const dia_semana = getDiaSemana(data);

    if (!dia_semana) {
      return res.status(400).json({ error: 'Não foi possível determinar o dia da semana' });
    }

    const escalaData = {
      data,
      dia_semana,
      voz_id: escala.voz_id || null,
      voz2_id: escala.voz2_id || null,
      violao_id: escala.violao_id || null,
      guitarra_id: escala.guitarra_id || null,
      baixo_id: escala.baixo_id || null,
      bateria_id: escala.bateria_id || null,
      teclado_id: escala.teclado_id || null,
      link_youtube: escala.link_youtube || null,
      atualizado_por: user.id,
      atualizado_em: new Date(),
    };

    const existing = await Escala.findOne({ data });

    if (existing) {
      await Escala.updateOne({ data }, { $set: escalaData });
    } else {
      escalaData.criado_por = user.id;
      await Escala.create(escalaData);
    }

    await Log.create({
      usuario_id: user.id,
      acao: 'edicao_escala',
      descricao: `Escala do dia ${data} (${dia_semana}) ${existing ? 'atualizada' : 'criada'} por ${user.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: 'Escala salva com sucesso!',
    });

  } catch (error) {
    console.error('Erro ao salvar escala:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Erro de validação',
        details: errors,
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao salvar escala',
      details: error.message,
    });
  }
}