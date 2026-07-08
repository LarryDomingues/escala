import connectDB from '../../lib/mongodb';
import Log from '../../lib/models/Log';
import { getUserFromToken } from '../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    await connectDB();

    const logs = await Log.find()
      .populate('usuario_id', 'nome')
      .sort({ data_hora: -1 })
      .limit(200)
      .lean();

    const result = logs.map(log => ({
      id: log._id,
      usuario_id: log.usuario_id?._id || null,
      usuario_nome: log.usuario_id?.nome || null,
      acao: log.acao,
      descricao: log.descricao,
      ip: log.ip,
      data_hora: log.data_hora,
    }));

    return res.status(200).json({ logs: result });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return res.status(500).json({ error: 'Erro ao buscar logs' });
  }
}
