import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true,
  },
  acao: {
    type: String,
    required: true,
    index: true,
    enum: [
      'login',
      'logout',
      'login_falha',
      'cadastro_membro',
      'edicao_membro',
      'excluir_membro',
      'edicao_escala',
      'playlist',
      'admin_usuarios',
      'ativar_usuario',
      'bloquear_usuario',
      'desbloquear_usuario',
      'promover_usuario',
      'rebaixar_usuario',
      'deletar_usuario',
      'vincular_usuario',
      'desvincular_usuario',
      'criar_admin',
      'reset_senha',
      'exportar_dados',
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
  user_agent: {
    type: String,
    default: '',
  },
  data_hora: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Campos adicionais para metadados
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Índices compostos para consultas rápidas
LogSchema.index({ usuario_id: 1, data_hora: -1 });
LogSchema.index({ acao: 1, data_hora: -1 });
LogSchema.index({ data_hora: -1 });

// Método estático para registrar log
LogSchema.statics.registrar = async function(usuarioId, acao, descricao, req = null, metadata = {}) {
  try {
    const log = new this({
      usuario_id: usuarioId,
      acao,
      descricao,
      ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '0.0.0.0',
      user_agent: req?.headers?.['user-agent'] || '',
      metadata,
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return null;
  }
};

// Método estático para buscar logs com filtros
LogSchema.statics.buscar = async function(filtros = {}, options = {}) {
  const {
    page = 1,
    limit = 50,
    sort = { data_hora: -1 },
    usuario_id,
    acao,
    data_inicio,
    data_fim,
  } = options;

  const query = { ...filtros };

  if (usuario_id) {
    query.usuario_id = usuario_id;
  }

  if (acao) {
    query.acao = acao;
  }

  if (data_inicio || data_fim) {
    query.data_hora = {};
    if (data_inicio) {
      query.data_hora.$gte = new Date(data_inicio);
    }
    if (data_fim) {
      query.data_hora.$lte = new Date(data_fim);
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find(query)
      .populate('usuario_id', 'nome email nivel')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Método estático para obter estatísticas
LogSchema.statics.estatisticas = async function(dias = 30) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const [total, porAcao, porUsuario, porDia] = await Promise.all([
    this.countDocuments({ data_hora: { $gte: dataLimite } }),
    this.aggregate([
      { $match: { data_hora: { $gte: dataLimite } } },
      { $group: { _id: '$acao', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $match: { data_hora: { $gte: dataLimite } } },
      { $group: { _id: '$usuario_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    this.aggregate([
      { $match: { data_hora: { $gte: dataLimite } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$data_hora' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Buscar nomes dos usuários
  const userIds = porUsuario.map(item => item._id).filter(id => id);
  const usuarios = await mongoose.model('Usuario').find({ _id: { $in: userIds } }).select('_id nome');
  const usuarioMap = {};
  usuarios.forEach(u => {
    usuarioMap[u._id.toString()] = u.nome;
  });

  const porUsuarioFormatado = porUsuario.map(item => ({
    usuario_id: item._id,
    usuario_nome: usuarioMap[item._id?.toString()] || 'Sistema',
    count: item.count,
  }));

  return {
    total,
    porAcao: porAcao.map(item => ({ acao: item._id, count: item.count })),
    porUsuario: porUsuarioFormatado,
    porDia: porDia.map(item => ({ data: item._id, count: item.count })),
  };
};

// Método estático para limpar logs antigos
LogSchema.statics.limparAntigos = async function(dias = 30) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);
  const result = await this.deleteMany({ data_hora: { $lt: dataLimite } });
  return result.deletedCount;
};

// Método para formatar a data
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

// Método para obter a ação em português
LogSchema.methods.getAcaoLabel = function() {
  const labels = {
    login: 'Login',
    logout: 'Logout',
    login_falha: 'Login Falho',
    cadastro_membro: 'Cadastro de Membro',
    edicao_membro: 'Edição de Membro',
    excluir_membro: 'Exclusão de Membro',
    edicao_escala: 'Edição de Escala',
    playlist: 'PlayList',
    admin_usuarios: 'Administração de Usuários',
    ativar_usuario: 'Ativação de Usuário',
    bloquear_usuario: 'Bloqueio de Usuário',
    desbloquear_usuario: 'Desbloqueio de Usuário',
    promover_usuario: 'Promoção de Usuário',
    rebaixar_usuario: 'Rebaixamento de Usuário',
    deletar_usuario: 'Exclusão de Usuário',
    vincular_usuario: 'Vinculação de Usuário',
    desvincular_usuario: 'Desvinculação de Usuário',
    criar_admin: 'Criação de Administrador',
    reset_senha: 'Reset de Senha',
    exportar_dados: 'Exportação de Dados',
  };
  return labels[this.acao] || this.acao;
};

// Método para obter a cor da badge
LogSchema.methods.getBadgeColor = function() {
  const colors = {
    login: 'bg-green-100 text-green-800',
    logout: 'bg-gray-100 text-gray-800',
    login_falha: 'bg-red-100 text-red-800',
    cadastro_membro: 'bg-blue-100 text-blue-800',
    edicao_membro: 'bg-yellow-100 text-yellow-800',
    excluir_membro: 'bg-red-100 text-red-800',
    edicao_escala: 'bg-purple-100 text-purple-800',
    playlist: 'bg-pink-100 text-pink-800',
    admin_usuarios: 'bg-indigo-100 text-indigo-800',
    ativar_usuario: 'bg-green-100 text-green-800',
    bloquear_usuario: 'bg-red-100 text-red-800',
    desbloquear_usuario: 'bg-green-100 text-green-800',
    promover_usuario: 'bg-blue-100 text-blue-800',
    rebaixar_usuario: 'bg-yellow-100 text-yellow-800',
    deletar_usuario: 'bg-red-100 text-red-800',
    vincular_usuario: 'bg-purple-100 text-purple-800',
    desvincular_usuario: 'bg-gray-100 text-gray-800',
    criar_admin: 'bg-indigo-100 text-indigo-800',
    reset_senha: 'bg-yellow-100 text-yellow-800',
    exportar_dados: 'bg-blue-100 text-blue-800',
  };
  return colors[this.acao] || 'bg-gray-100 text-gray-800';
};

// Hook para serialização
LogSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export default mongoose.models.Log || mongoose.model('Log', LogSchema);