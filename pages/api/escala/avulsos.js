// pages/api/escala/avulsos.js
import connectDB from '../../../lib/mongodb';
import { EscalaAvulsa } from '../../../lib/models';
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

  // GET - Buscar dias avulsos
  if (req.method === 'GET') {
    try {
      const { ano, mes } = req.query;
      
      if (!ano || !mes) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }

      const diasAvulsos = await EscalaAvulsa.find({
        data: { $regex: `^${ano}-${mes.padStart(2, '0')}` }
      }).sort({ data: 1 });

      return res.status(200).json(diasAvulsos);
    } catch (error) {
      console.error('Erro ao buscar dias avulsos:', error);
      return res.status(500).json({ error: 'Erro ao buscar dias avulsos' });
    }
  }

  // POST - Adicionar dia avulso
  if (req.method === 'POST') {
    try {
      const { data, mes, dia_semana } = req.body;

      if (!data || !mes) {
        return res.status(400).json({ error: 'Data e mês são obrigatórios' });
      }

      // Verificar se já existe
      const existe = await EscalaAvulsa.findOne({ data });
      if (existe) {
        return res.status(400).json({ error: 'Esta data já foi adicionada como avulsa' });
      }

      const diaAvulso = await EscalaAvulsa.create({
        data,
        mes,
        dia_semana: dia_semana || '',
        criado_por: user.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Data avulsa adicionada com sucesso!',
        diaAvulso,
      });
    } catch (error) {
      console.error('Erro ao adicionar dia avulso:', error);
      return res.status(500).json({ error: 'Erro ao adicionar dia avulso' });
    }
  }

  // DELETE - Remover dia avulso
  if (req.method === 'DELETE') {
    try {
      const { data } = req.query;

      if (!data) {
        return res.status(400).json({ error: 'Data é obrigatória' });
      }

      const result = await EscalaAvulsa.deleteOne({ data });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Data avulsa não encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Data avulsa removida com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao remover dia avulso:', error);
      return res.status(500).json({ error: 'Erro ao remover dia avulso' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}