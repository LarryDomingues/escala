import connectDB from '../../../lib/mongodb';
import Log from '../../../lib/models/Log';
import { removeTokenCookie, getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const user = getUserFromToken(req);
    if (user) {
      await connectDB();
      await Log.create({
        usuario_id: user.id,
        acao: 'logout',
        descricao: `Logout realizado por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });
    }
  } catch (error) {
    console.error('Erro ao registrar logout:', error);
  }

  removeTokenCookie(res);
  return res.status(200).json({ success: true });
}