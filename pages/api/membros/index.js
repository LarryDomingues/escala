// pages/api/membros/index.js
import connectDB from '../../../lib/mongodb';
import { Membro, Usuario, Habilidade, Log } from '../../../lib/models';
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

      // Buscar membros com populate correto
      const membros = await Membro.find()
        .populate({
          path: 'usuario_id',
          model: 'Usuario',
          select: 'nome email'
        })
        .populate({
          path: 'habilidade_ids',
          model: 'Habilidade',
          select: 'nome'
        })
        .sort({ nome: 1 })
        .lean();

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
      return res.status(500).json({ 
        error: 'Erro ao buscar membros',
        details: error.message 
      });
    }
  }

  // POST - Criar membro
  if (req.method === 'POST') {
    try {
      const { nome, celular, email, data_nascimento, habilidades } = req.body;

      if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      await connectDB();

      let usuario_id = null;
      if (email && email.trim() !== '') {
        const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
        if (usuarioExistente) {
          usuario_id = usuarioExistente._id;
        } else {
          const senhaTemp = Math.random().toString(36).slice(-8);
          const novoUsuario = await Usuario.create({
            nome: nome.trim(),
            email: email.toLowerCase(),
            senha: senhaTemp,
            status: 'ativo',
            nivel: 'membro',
          });
          usuario_id = novoUsuario._id;
        }
      }

      const membro = await Membro.create({
        usuario_id,
        nome: nome.trim(),
        celular: celular || '',
        email: email || '',
        data_nascimento: data_nascimento || '',
        habilidade_ids: habilidades || [],
        criado_por: user.id,
      });

      await Log.create({
        usuario_id: user.id,
        acao: 'cadastro_membro',
        descricao: `Membro '${nome}' cadastrado por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      // Invalidar cache
      membrosCache.clear();

      return res.status(201).json({
        success: true,
        message: 'Membro cadastrado com sucesso!',
        membro: { id: membro._id, nome: membro.nome },
      });
    } catch (error) {
      console.error('Erro ao criar membro:', error);
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