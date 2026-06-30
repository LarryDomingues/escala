import connectDB from '../../../lib/mongodb';
import Escala from '../../../lib/models/Escala';
import Log from '../../../lib/models/Log';
import { getUserFromToken } from '../../../lib/auth';

// Função para obter o dia da semana em português
function getDiaSemana(data) {
  const dias = {
    '2026-06-30': 'Terça-feira',
    '2026-07-01': 'Quarta-feira',
    '2026-07-02': 'Quinta-feira',
    '2026-07-03': 'Sexta-feira',
    '2026-07-04': 'Sábado',
    '2026-07-05': 'Domingo',
    '2026-07-06': 'Segunda-feira',
  };
  
  // Se a data estiver no mapa, usar o valor mapeado
  if (dias[data]) {
    return dias[data];
  }
  
  // Caso contrário, calcular
  const date = new Date(data + 'T00:00:00');
  const diaSemana = date.getDay();
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return diasSemana[diaSemana];
}

export default async function handler(req, res) {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Verificar permissão
  if (user.nivel !== 'admin' && user.nivel !== 'coordenador') {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  try {
    await connectDB();

    const { data, escala } = req.body;

    // Validar dados
    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    if (!escala || typeof escala !== 'object') {
      return res.status(400).json({ error: 'Dados da escala inválidos' });
    }

    // Validar formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: 'Formato de data inválido' });
    }

    // Obter o dia da semana
    const dia_semana = getDiaSemana(data);
    
    // Verificar se o dia da semana foi encontrado
    if (!dia_semana) {
      return res.status(400).json({ error: 'Não foi possível determinar o dia da semana' });
    }

    // Preparar dados para salvar - garantir que todos os campos estejam definidos
    const escalaData = {
      data: data,
      dia_semana: dia_semana,
      voz_id: escala.voz_id && escala.voz_id !== '' ? escala.voz_id : null,
      voz2_id: escala.voz2_id && escala.voz2_id !== '' ? escala.voz2_id : null,
      violao_id: escala.violao_id && escala.violao_id !== '' ? escala.violao_id : null,
      guitarra_id: escala.guitarra_id && escala.guitarra_id !== '' ? escala.guitarra_id : null,
      baixo_id: escala.baixo_id && escala.baixo_id !== '' ? escala.baixo_id : null,
      bateria_id: escala.bateria_id && escala.bateria_id !== '' ? escala.bateria_id : null,
      teclado_id: escala.teclado_id && escala.teclado_id !== '' ? escala.teclado_id : null,
      link_youtube: escala.link_youtube || null,
      atualizado_por: user.id,
      atualizado_em: new Date(),
    };

    // Verificar se já existe escala para esta data
    const existing = await Escala.findOne({ data });

    let result;
    if (existing) {
      // Atualizar existente
      result = await Escala.updateOne(
        { data },
        { $set: escalaData }
      );
    } else {
      // Criar nova
      escalaData.criado_por = user.id;
      result = await Escala.create(escalaData);
    }

    // Registrar log
    await Log.create({
      usuario_id: user.id,
      acao: 'edicao_escala',
      descricao: `Escala do dia ${data} (${dia_semana}) ${existing ? 'atualizada' : 'criada'} por ${user.nome}`,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
    });

    return res.status(200).json({
      success: true,
      message: 'Escala salva com sucesso!',
      data: {
        data,
        dia_semana,
        atualizado: !!existing,
      },
    });

  } catch (error) {
    console.error('Erro ao salvar escala:', error);
    
    // Verificar se é erro de validação do Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Erro de validação',
        details: errors,
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao salvar escala',
      details: error.message,
    });
  }
}