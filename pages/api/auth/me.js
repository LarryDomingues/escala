import connectDB from '../../../lib/mondodb';
import Usuario from '../../../lib/models/Usuario';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    await connectDB();
    const usuario = await Usuario.findById(user.id).select('-senha -token_ativacao -token_recuperacao');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json({
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      nivel: usuario.nivel,
      status: usuario.status,
      ultimo_login: usuario.ultimo_login,
      data_cadastro: usuario.data_cadastro,
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}