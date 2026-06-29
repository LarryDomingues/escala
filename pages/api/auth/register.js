import connectDB from '../../../lib/mongodb';
import Usuario from '../../../lib/models/Usuario';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    await connectDB();

    const { nome, email, senha, confirmar_senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (senha !== confirmar_senha) {
      return res.status(400).json({ error: 'As senhas não coincidem' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    await Usuario.create({
      nome,
      email: email.toLowerCase(),
      senha,
      status: 'pendente',
      nivel: 'membro',
    });

    return res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}