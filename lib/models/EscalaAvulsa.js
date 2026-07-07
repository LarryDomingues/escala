// lib/models/EscalaAvulsa.js
import mongoose from 'mongoose';

const EscalaAvulsaSchema = new mongoose.Schema({
  data: {
    type: String,
    required: true,
    unique: true,
  },
  mes: {
    type: String,
    required: true,
  },
  dia_semana: {
    type: String,
    default: '',
  },
  criado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null,
  },
  criado_em: {
    type: Date,
    default: Date.now,
  },
});

EscalaAvulsaSchema.index({ data: 1 }, { unique: true });
EscalaAvulsaSchema.index({ mes: 1 });

const EscalaAvulsa = mongoose.models.EscalaAvulsa || mongoose.model('EscalaAvulsa', EscalaAvulsaSchema);

export default EscalaAvulsa;