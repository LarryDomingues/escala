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

// Método para formatar data
LogSchema.methods.formatarData = function() {
  if (!this.data_hora) return '-';
  return this.data_hora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

LogSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export default mongoose.models.Log || mongoose.model('Log', LogSchema);