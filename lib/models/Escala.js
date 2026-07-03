// lib/models/Escala.js
import mongoose from 'mongoose';

const EscalaSchema = new mongoose.Schema({
  data: {
    type: String,
    required: true,
    unique: true,
  },
  dia_semana: {
    type: String,
    required: true,
  },
  voz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  voz2_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  violao_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  guitarra_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  baixo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  bateria_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  teclado_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membro',
    default: null,
  },
  link_youtube: {
    type: String,
    default: null,
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
  atualizado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null,
  },
  atualizado_em: {
    type: Date,
    default: null,
  },
});

EscalaSchema.index({ data: 1 }, { unique: true });

EscalaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Escala = mongoose.models.Escala || mongoose.model('Escala', EscalaSchema);

export default Escala;