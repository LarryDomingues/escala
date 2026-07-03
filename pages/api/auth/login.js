import connectDB from '../../../lib/mongodb';
import Usuario from '../../../lib/models/Usuario';
import Membro from '../../../lib/models/Membro';
import Log from '../../../lib/models/Log';
import { createToken, setTokenCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    await connectDB();

    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário sem excluir a senha (o select padrão já inclui)
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    if (!usuario) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (usuario.status === 'pendente') {
      return res.status(401).json({ error: 'Aguardando aprovação do administrador' });
    }

    if (usuario.status === 'bloqueado') {
      return res.status(401).json({ error: 'Usuário bloqueado. Entre em contato com o administrador' });
    }

    // Usar o método comparePassword do modelo
    const isMatch = await usuario.comparePassword(senha);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Atualizar último login
    usuario.ultimo_login = new Date();
    await usuario.save();

    // Buscar membro vinculado
    const membro = await Membro.findOne({ usuario_id: usuario._id }).select('_id nome');

    // Registrar log
    await Log.create({
      usuario_id: usuario._id,
      acao: 'login',
      descricao: `Login realizado por ${usuario.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    const token = createToken(usuario);
    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      user: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
        status: usuario.status,
        membro: membro ? {
          id: membro._id,
          nome: membro.nome,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}