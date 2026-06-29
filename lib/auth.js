import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-aqui';

export function createToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      nome: user.nome, 
      nivel: user.nivel 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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