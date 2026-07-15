import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import { getUserFromToken } from '../../../lib/auth';

// Cache para escalas
const escalaCache = new Map();
const ESCALA_CACHE_TTL = 60000; // 1 minuto

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (req.method === 'GET') {
    try {
      const { mes } = req.query;
      
      if (!mes) {
        return res.status(400).json({ error: 'Mês é obrigatório' });
      }

      // Verificar cache
      const cacheKey = `escala_${mes}_${user.nivel}`;
      const cachedData = escalaCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < ESCALA_CACHE_TTL) {
        return res.status(200).json(cachedData.data);
      }

      await connectDB();

      const [ano, mesNum] = mes.split('-');
      const startDate = `${ano}-${mesNum}-01`;
      const lastDay = new Date(ano, parseInt(mesNum), 0).getDate();
      const endDate = `${ano}-${mesNum}-${String(lastDay).padStart(2, '0')}`;

      const escalas = await Escala.find({
        data: { $gte: startDate, $lte: endDate }
      })
      .populate('voz_id', 'nome')
      .populate('voz2_id', 'nome')
      .populate('violao_id', 'nome')
      .populate('guitarra_id', 'nome')
      .populate('baixo_id', 'nome')
      .populate('bateria_id', 'nome')
      .populate('teclado_id', 'nome')
      .sort({ data: 1 })
      .lean();

      const result = escalas.map(escala => ({
        id: escala._id,
        data: escala.data,
        dia_semana: escala.dia_semana,
        voz_id: escala.voz_id?._id || null,
        voz_nome: escala.voz_id?.nome || null,
        voz2_id: escala.voz2_id?._id || null,
        voz2_nome: escala.voz2_id?.nome || null,
        violao_id: escala.violao_id?._id || null,
        violao_nome: escala.violao_id?.nome || null,
        guitarra_id: escala.guitarra_id?._id || null,
        guitarra_nome: escala.guitarra_id?.nome || null,
        baixo_id: escala.baixo_id?._id || null,
        baixo_nome: escala.baixo_id?.nome || null,
        bateria_id: escala.bateria_id?._id || null,
        bateria_nome: escala.bateria_id?.nome || null,
        teclado_id: escala.teclado_id?._id || null,
        teclado_nome: escala.teclado_id?.nome || null,
        link_youtube: escala.link_youtube || null,
        anotacao: escala.anotacao || null,
      }));

      // Armazenar em cache
      escalaCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar escala:', error);
      return res.status(500).json({ error: 'Erro ao buscar escala' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of escalaCache) {
    if (now - value.timestamp > ESCALA_CACHE_TTL) {
      escalaCache.delete(key);
    }
  }
}, ESCALA_CACHE_TTL);