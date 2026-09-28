import connectDB from '../../../lib/mongodb';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  await connectDB();

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const log = await Log.findByIdAndDelete(id);
      if (!log) {
        return res.status(404).json({ error: 'Log não encontrado' });
      }
      return res.status(200).json({ success: true, message: 'Log removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover log:', error);
      return res.status(500).json({ error: 'Erro ao remover log' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}