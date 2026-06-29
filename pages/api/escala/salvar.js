import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getDiaSemana(data) {
  const dias = {
    Sunday: 'Domingo',
    Monday: 'Segunda-feira',
    Tuesday: 'Terça-feira',
    Wednesday: 'Quarta-feira',
    Thursday: 'Quinta-feira',
    Friday: 'Sexta-feira',
    Saturday: 'Sábado',
  };
  const date = parseISO(data);
  return dias[format(date, 'EEEE', { locale: ptBR })];
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  try {
    await connectDB();

    const { data, escala } = req.body;

    if (!data || !escala) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const dia_semana = getDiaSemana(data);

    const escalaData = {
      data,
      dia_semana,
      voz_id: escala.voz_id || null,
      voz2_id: escala.voz2_id || null,
      violao_id: escala.violao_id || null,
      guitarra_id: escala.guitarra_id || null,
      baixo_id: escala.baixo_id || null,
      bateria_id: escala.bateria_id || null,
      teclado_id: escala.teclado_id || null,
      atualizado_por: user.id,
      atualizado_em: new Date(),
    };

    const existing = await Escala.findOne({ data });

    if (existing) {
      await Escala.updateOne({ data }, { $set: escalaData });
    } else {
      escalaData.criado_por = user.id;
      await Escala.create(escalaData);
    }

    await Log.create({
      usuario_id: user.id,
      acao: 'edicao_escala',
      descricao: `Escala do dia ${data} ${dia_semana} atualizada por ${user.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: 'Escala salva com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao salvar escala:', error);
    return res.status(500).json({ error: 'Erro ao salvar escala' });
  }
}