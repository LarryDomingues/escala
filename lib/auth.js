// lib/auth.js
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-aqui';
const JWT_EXPIRES_IN = '7d';

// Cache para verificação de token
const tokenCache = new Map();
const CACHE_TTL = 60000; // 1 minuto

export function createToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      nome: user.nome, 
      nivel: user.nivel 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  // Verificar cache primeiro
  const cachedResult = tokenCache.get(token);
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
    return cachedResult.data;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Armazenar em cache
    tokenCache.set(token, {
      data: decoded,
      timestamp: Date.now()
    });
    return decoded;
  } catch (error) {
    return null;
  }
}

export function setTokenCookie(res, token) {
  const cookie = serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function removeTokenCookie(res) {
  const cookie = serialize('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: -1,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getTokenFromCookies(req) {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  return cookies.token || null;
}

export function getUserFromToken(req) {
  const token = getTokenFromCookies(req);
  if (!token) return null;
  return verifyToken(token);
}

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache) {
    if (now - value.timestamp > CACHE_TTL) {
      tokenCache.delete(key);
    }
  }
}, CACHE_TTL);