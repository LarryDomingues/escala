import connectDB from '../../../../lib/mongodb';
import Membro from '../../../../lib/models/Membro';
import Usuario from '../../../../lib/models/Usuario';
import Log from '../../../../lib/models/Log';
import { getUserFromToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem bloquear membros.' });
  }

  try {
    await connectDB();

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do membro é obrigatório' });
    }

    const membro = await Membro.findById(id);
    if (!membro) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    if (!membro.usuario_id) {
      return res.status(400).json({ error: 'Membro não possui usuário vinculado' });
    }

    const usuario = await Usuario.findById(membro.usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário vinculado não encontrado' });
    }

    if (usuario.nivel === 'admin') {
      return res.status(400).json({ error: 'Não é possível bloquear um administrador' });
    }

    usuario.status = 'bloqueado';
    await usuario.save();

    await Log.create({
      usuario_id: user.id,
      acao: 'bloquear_usuario',
      descricao: `Usuário ${usuario.nome} (membro: ${membro.nome}) bloqueado por ${user.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: `Membro ${membro.nome} bloqueado com sucesso!`,
    });

  } catch (error) {
    console.error('Erro ao bloquear membro:', error);
    return res.status(500).json({
      error: 'Erro ao bloquear membro',
      details: error.message,
    });
  }
}