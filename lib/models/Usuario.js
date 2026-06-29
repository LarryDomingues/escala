import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  senha: { type: String, required: true },
  status: { type: String, enum: ['pendente', 'ativo', 'bloqueado'], default: 'pendente' },
  nivel: { type: String, enum: ['admin', 'coordenador', 'membro'], default: 'membro' },
  ultimo_login: Date,
  data_cadastro: { type: Date, default: Date.now },
  token_ativacao: String,
  token_recuperacao: String,
  data_recuperacao: Date,
});

UsuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

UsuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.senha);
};

UsuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.senha;
  delete obj.token_ativacao;
  delete obj.token_recuperacao;
  return obj;
};

export default mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);