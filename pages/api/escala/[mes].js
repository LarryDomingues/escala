import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Membro from '../../../lib/models/Membro';
import { getUserFromToken } from '../../../lib/auth';

const cache = new Map();
const CACHE_TTL = 60000;

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { mes } = req.query;

    const cacheKey = `escala_full_${mes}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
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
    .sort({ data: 1 });

    const membros = await Membro.find().sort({ nome: 1 }).select('_id nome');

    const result = {
      escalas: escalas.map(escala => ({
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
      })),
      membros: membros.map(m => ({ id: m._id, nome: m.nome })),
    };

    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar escala:', error);
    return res.status(500).json({ error: 'Erro ao buscar escala' });
  }
}