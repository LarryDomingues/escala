// lib/logger.js
import connectDB from './mongodb';
import Log from './models/Log';

export async function registrarLog({ usuario_id, usuario_nome, usuario_email, acao, descricao, req }) {
  try {
    await connectDB();
    
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() 
      || req?.socket?.remoteAddress 
      || '0.0.0.0';
    
    const user_agent = req?.headers?.['user-agent'] || null;

    await Log.registrar({
      usuario_id,
      usuario_nome,
      usuario_email,
      acao,
      descricao,
      ip,
      user_agent,
    });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    // Não lançar erro para não quebrar a operação principal
  }
}