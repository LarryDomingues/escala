// lib/models/Membro.js
import mongoose from 'mongoose';
import Habilidade from './Habilidade'; // Importar explicitamente

const MembroSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null,
  },
  nome: {
    type: String,
    required: true,
    trim: true,
  },
  celular: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  data_nascimento: {
    type: String,
    default: '',
  },
  habilidade_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habilidade', // Referência ao modelo Habilidade
    default: [],
  }],
  criado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null,
  },
  criado_em: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para atualizar updatedAt
MembroSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware para findOneAndUpdate
MembroSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

MembroSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Membro = mongoose.models.Membro || mongoose.model('Membro', MembroSchema);

export default Membro;