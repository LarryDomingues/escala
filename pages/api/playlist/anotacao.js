// pages/api/playlist/anotacao.js
import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Membro from '../../../lib/models/Membro';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await connectDB();

  try {
    const { data, anotacao } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    // Buscar a escala
    const escala = await Escala.findOne({ data });
    if (!escala) {
      return res.status(404).json({ error: 'Escala não encontrada para esta data' });
    }

    // Verificar permissão
    let podeEditar = user.nivel === 'admin';
    if (!podeEditar) {
      const membro = await Membro.findOne({ usuario_id: user.id });
      if (membro) {
        const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
        podeEditar = campos.some(campo => escala[campo] && escala[campo].toString() === membro._id.toString());
      }
    }

    if (!podeEditar) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esta data' });
    }

    // Salvar anotação
    escala.anotacao = anotacao || null;
    escala.atualizado_por = user.id;
    escala.atualizado_em = new Date();
    await escala.save();

    return res.status(200).json({
      success: true,
      message: anotacao ? 'Anotação salva com sucesso!' : 'Anotação removida com sucesso!',
      anotacao: anotacao,
    });
  } catch (error) {
    console.error('Erro ao salvar anotação:', error);
    return res.status(500).json({ error: 'Erro ao salvar anotação' });
  }
}