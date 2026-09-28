import connectDB from '../../../lib/mongodb';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem acessar os logs.' });
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { 
        limit = 100, 
        page = 1, 
        acao, 
        usuario_id,
        data_inicio,
        data_fim,
      } = req.query;

      // Construir filtros
      const filtros = {};
      
      if (acao && acao !== 'todas') {
        filtros.acao = acao;
      }
      
      if (usuario_id && usuario_id !== 'todos') {
        filtros.usuario_id = usuario_id;
      }
      
      if (data_inicio || data_fim) {
        filtros.data_hora = {};
        if (data_inicio) {
          filtros.data_hora.$gte = new Date(data_inicio);
        }
        if (data_fim) {
          const fim = new Date(data_fim);
          fim.setHours(23, 59, 59, 999);
          filtros.data_hora.$lte = fim;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [logs, total] = await Promise.all([
        Log.find(filtros)
          .populate({
            path: 'usuario_id',
            select: 'nome email',
            options: { lean: true },
          })
          .sort({ data_hora: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Log.countDocuments(filtros),
      ]);

      const formattedLogs = logs.map(log => ({
        id: log._id,
        usuario_id: log.usuario_id?._id || null,
        usuario_nome: log.usuario_id?.nome || log.usuario_nome || 'Sistema',
        usuario_email: log.usuario_id?.email || log.usuario_email || null,
        acao: log.acao,
        descricao: log.descricao,
        ip: log.ip,
        data_hora: log.data_hora,
      }));

      // Buscar lista de ações únicas para o filtro
      const acoes = await Log.distinct('acao');

      return res.status(200).json({ 
        logs: formattedLogs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        acoes,
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      return res.status(500).json({ error: 'Erro ao buscar logs: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}