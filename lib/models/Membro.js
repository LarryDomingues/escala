import mongoose from 'mongoose';

const MembroSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  nome: { type: String, required: true },
  celular: String,
  email: String,
  data_nascimento: String,
  habilidade_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habilidade' }],
  criado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  criado_em: { type: Date, default: Date.now },
});

MembroSchema.methods.toJSON = function() {
  const obj = this.toObject();
  return obj;
};

export default mongoose.models.Membro || mongoose.model('Membro', MembroSchema);