import connectDB from '../../../lib/mongodb';
import { Usuario, Membro } from '../../../lib/models';
import { getUserFromToken } from '../../../lib/auth';

// Cache para dados do usuário
const userCache = new Map();
const USER_CACHE_TTL = 30000; // 30 segundos

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Verificar cache
    const cacheKey = `user_${user.id}`;
    const cachedData = userCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < USER_CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }

    await connectDB();
    
    // Buscar usuário
    const usuario = await Usuario.findById(user.id)
      .select('nome email nivel status ultimo_login data_cadastro')
      .lean();

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar membro vinculado a este usuário
    const membro = await Membro.findOne({ usuario_id: user.id })
      .select('_id nome')
      .lean();

    const responseData = {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      nivel: usuario.nivel,
      status: usuario.status,
      ultimo_login: usuario.ultimo_login,
      data_cadastro: usuario.data_cadastro,
      membro: membro ? {
        id: membro._id,
        nome: membro.nome,
      } : null,
    };

    // Armazenar em cache
    userCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache) {
    if (now - value.timestamp > USER_CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, USER_CACHE_TTL);