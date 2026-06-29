import mongoose from 'mongoose';

const HabilidadeSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
}, {
  timestamps: true,
});

export default mongoose.models.Habilidade || mongoose.model('Habilidade', HabilidadeSchema);