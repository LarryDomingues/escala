import connectDB from '../../../lib/mongodb';
import Membro from '../../../lib/models/Membro';
import { getUserFromToken } from '../../../lib/auth';

// Cache para membros
const membrosCache = new Map();
const MEMBROS_CACHE_TTL = 60000; // 1 minuto

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  // GET - Listar membros
  if (req.method === 'GET') {
    try {
      // Verificar cache
      const cacheKey = `membros_${user.nivel}`;
      const cachedData = membrosCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < MEMBROS_CACHE_TTL) {
        return res.status(200).json(cachedData.data);
      }

      await connectDB();

      const membros = await Membro.find()
        .populate('usuario_id', 'nome email')
        .populate('habilidade_ids', 'nome')
        .sort({ nome: 1 })
        .lean(); // .lean() para performance

      const result = membros.map(membro => ({
        id: membro._id,
        nome: membro.nome,
        celular: membro.celular || '',
        email: membro.email || '',
        data_nascimento: membro.data_nascimento || '',
        usuario_id: membro.usuario_id?._id || null,
        usuario_sistema: membro.usuario_id?.nome || 'Sem usuário',
        habilidades: membro.habilidade_ids?.map(h => h.nome).join(', ') || '',
        habilidade_ids: membro.habilidade_ids?.map(h => h._id.toString()) || [],
      }));

      // Armazenar em cache
      membrosCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      return res.status(500).json({ error: 'Erro ao buscar membros' });
    }
  }

  // POST - Criar membro (invalida cache)
  if (req.method === 'POST') {
    try {
      // ... código de criação
      
      // Invalidar cache
      membrosCache.clear();
      
      return res.status(201).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar membro' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of membrosCache) {
    if (now - value.timestamp > MEMBROS_CACHE_TTL) {
      membrosCache.delete(key);
    }
  }
}, MEMBROS_CACHE_TTL);