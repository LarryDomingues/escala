import connectDB from '../../../../lib/mongodb';
import Usuario from '../../../../lib/models/Usuario';
import { getUserFromToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem acessar.' });
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const usuarios = await Usuario.find()
        .select('-senha -token_ativacao -token_recuperacao')
        .sort({ data_cadastro: -1 });
      return res.status(200).json(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}