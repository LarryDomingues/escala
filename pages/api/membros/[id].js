import connectDB from '../../../lib/mongodb';
import Membro from '../../../lib/models/Membro';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  await connectDB();

  const { id } = req.query;

  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: 'ID do membro inválido' });
  }

  if (req.method === 'GET') {
    try {
      const membro = await Membro.findById(id)
        .populate('habilidade_ids', 'nome')
        .populate('criado_por', 'nome');

      if (!membro) {
        return res.status(404).json({ error: 'Membro não encontrado' });
      }

      return res.status(200).json({
        id: membro._id,
        nome: membro.nome,
        celular: membro.celular,
        email: membro.email,
        data_nascimento: membro.data_nascimento,
        habilidade_ids: membro.habilidade_ids?.map(h => h._id.toString()) || [],
      });
    } catch (error) {
      console.error('Erro ao buscar membro:', error);
      return res.status(500).json({ error: 'Erro ao buscar membro' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nome, celular, email, data_nascimento, habilidade_ids } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      const membro = await Membro.findById(id);
      if (!membro) {
        return res.status(404).json({ error: 'Membro não encontrado' });
      }

      membro.nome = nome;
      membro.celular = celular;
      membro.email = email;
      membro.data_nascimento = data_nascimento;
      membro.habilidade_ids = habilidade_ids || [];
      await membro.save();

      await Log.create({
        usuario_id: user.id,
        acao: 'edicao_membro',
        descricao: `Membro '${nome}' editado por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: 'Membro atualizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      return res.status(500).json({ error: 'Erro ao atualizar membro' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const membro = await Membro.findById(id);
      if (!membro) {
        return res.status(404).json({ error: 'Membro não encontrado' });
      }

      const nomeMembro = membro.nome;
      await Membro.findByIdAndDelete(id);

      await Log.create({
        usuario_id: user.id,
        acao: 'excluir_membro',
        descricao: `Membro '${nomeMembro}' excluído por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: 'Membro excluído com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao excluir membro:', error);
      return res.status(500).json({ error: 'Erro ao excluir membro' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}