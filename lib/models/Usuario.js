// lib/models/Usuario.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UsuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  senha: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pendente', 'ativo', 'bloqueado'],
    default: 'pendente',
  },
  nivel: {
    type: String,
    enum: ['admin', 'coordenador', 'membro'],
    default: 'membro',
  },
  ultimo_login: {
    type: Date,
    default: null,
  },
  data_cadastro: {
    type: Date,
    default: Date.now,
  },
  token_ativacao: {
    type: String,
    default: null,
  },
  token_recuperacao: {
    type: String,
    default: null,
  },
  data_recuperacao: {
    type: Date,
    default: null,
  },
});

// Hash da senha antes de salvar
UsuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
UsuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.senha);
};

UsuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.senha;
  delete obj.token_ativacao;
  delete obj.token_recuperacao;
  delete obj.__v;
  return obj;
};

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);

export default Usuario;
