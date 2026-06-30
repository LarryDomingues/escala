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

HabilidadeSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export default mongoose.models.Habilidade || mongoose.model('Habilidade', HabilidadeSchema);