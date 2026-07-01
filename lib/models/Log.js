// lib/models/Log.js
import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  acao: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_falha',
      'cadastro_membro', 'edicao_membro', 'excluir_membro',
      'edicao_escala', 'playlist',
      'admin_usuarios', 'ativar_usuario', 'bloquear_usuario',
      'desbloquear_usuario', 'promover_usuario', 'rebaixar_usuario',
      'deletar_usuario', 'vincular_usuario', 'desvincular_usuario'
    ],
  },
  descricao: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    default: '0.0.0.0',
  },
  data_hora: {
    type: Date,
    default: Date.now,
  },
});

// Índices
LogSchema.index({ data_hora: -1 });
LogSchema.index({ usuario_id: 1, data_hora: -1 });

LogSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);

export default Log;