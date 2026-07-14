// lib/mongodb.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'escala_louvor';

if (!MONGODB_URI) {
  throw new Error('Por favor defina a variável MONGODB_URI no .env.local');
}

// Cache global para conexão
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (process.env.MONGODB_DNS) {
      const dns = require('dns');
      const servers = process.env.MONGODB_DNS.split(',').map(s => s.trim());
      dns.setServers(servers);
      console.log(`🌐 DNS forçado: ${servers.join(', ')}`);
    }

    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB conectado');
      return mongoose;
    }).catch((err) => {
      console.error('❌ Erro ao conectar MongoDB:', err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;