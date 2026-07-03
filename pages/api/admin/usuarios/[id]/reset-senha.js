import connectDB from '../../../../../lib/mongodb';
import Usuario from '../../../../../lib/models/Usuario';
import Log from '../../../../../lib/models/Log';
import { getUserFromToken } from '../../../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem resetar senhas.' });
  }

  try {
    await connectDB();

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    if (id === user.id) {
      return res.status(400).json({ error: 'Não é possível resetar a própria senha' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gerar nova senha aleatória (8 caracteres)
    const novaSenha = Math.random().toString(36).slice(-8);
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    usuario.senha = senhaHash;
    await usuario.save();

    await Log.create({
      usuario_id: user.id,
      acao: 'reset_senha',
      descricao: `Senha do usuário ${usuario.nome} foi resetada por ${user.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: 'Senha resetada com sucesso!',
      novaSenha: novaSenha,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return res.status(500).json({ error: 'Erro ao resetar senha' });
  }
}