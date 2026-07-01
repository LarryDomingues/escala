// pages/api/membros/habilidades.js
import connectDB from '../../../lib/mongodb';
import Habilidade from '../../../lib/models/Habilidade';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    await connectDB();

    let habilidades = await Habilidade.find().sort({ nome: 1 });
    
    // Se não houver habilidades no banco, criar as padrão
    if (habilidades.length === 0) {
      const habilidadesPadrao = ['Voz', 'Voz2', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado'];
      await Habilidade.insertMany(habilidadesPadrao.map(nome => ({ nome })));
      habilidades = await Habilidade.find().sort({ nome: 1 });
    }

    const result = habilidades.map(h => ({
      id: h._id,
      nome: h.nome,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar habilidades:', error);
    return res.status(500).json({ error: 'Erro ao buscar habilidades' });
  }
}