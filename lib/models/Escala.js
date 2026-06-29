import mongoose from 'mongoose';

const EscalaSchema = new mongoose.Schema({
  data: { type: String, required: true },
  dia_semana: { type: String, required: true },
  voz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  voz2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  violao_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  guitarra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  baixo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  bateria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  teclado_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
  link_youtube: String,
  criado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  criado_em: { type: Date, default: Date.now },
  atualizado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  atualizado_em: Date,
});

EscalaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return obj;
};

export default mongoose.models.Escala || mongoose.model('Escala', EscalaSchema);