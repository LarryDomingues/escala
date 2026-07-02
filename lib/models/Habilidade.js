// lib/models/Habilidade.js
import mongoose from 'mongoose';

const HabilidadeSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Registrar o modelo de forma explícita
const Habilidade = mongoose.models.Habilidade || mongoose.model('Habilidade', HabilidadeSchema);

export default Habilidade;