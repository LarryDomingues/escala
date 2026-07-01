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
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem ativar contas.' });
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

    if (membro.usuario_id) {
      return res.status(400).json({ error: 'Este membro já possui um usuário vinculado' });
    }

    if (!membro.email) {
      return res.status(400).json({ error: 'Membro não possui email cadastrado' });
    }

    // Verificar se já existe usuário com este email
    const usuarioExistente = await Usuario.findOne({ email: membro.email.toLowerCase() });
    if (usuarioExistente) {
      // Vincular o membro ao usuário existente
      membro.usuario_id = usuarioExistente._id;
      await membro.save();

      await Log.create({
        usuario_id: user.id,
        acao: 'vincular_usuario',
        descricao: `Membro ${membro.nome} vinculado ao usuário existente ${usuarioExistente.nome} por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: `Membro vinculado ao usuário existente ${usuarioExistente.nome}`,
      });
    }

    // Criar novo usuário com senha aleatória
    const senhaTemp = Math.random().toString(36).slice(-8);
    const novoUsuario = await Usuario.create({
      nome: membro.nome,
      email: membro.email.toLowerCase(),
      senha: senhaTemp,
      status: 'ativo',
      nivel: 'membro',
    });

    // Vincular membro ao usuário
    membro.usuario_id = novoUsuario._id;
    await membro.save();

    await Log.create({
      usuario_id: user.id,
      acao: 'vincular_usuario',
      descricao: `Conta ativada para membro ${membro.nome} por ${user.nome}. Email: ${membro.email}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: `Conta ativada com sucesso! Usuário criado: ${membro.email} (senha temporária: ${senhaTemp})`,
      usuario: {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        senha_temp: senhaTemp,
      },
    });

  } catch (error) {
    console.error('Erro ao ativar conta:', error);
    return res.status(500).json({
      error: 'Erro ao ativar conta',
      details: error.message,
    });
  }
}