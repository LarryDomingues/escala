import connectDB from '../../lib/mongodb';
import { Membro, Escala, Log } from '../../lib/models';
import { getUserFromToken } from '../../lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem importar escalas' });
  }

  try {
    await connectDB();

    // Processar upload do arquivo
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Verificar se o arquivo foi enviado
    const arquivo = files.arquivo;
    if (!arquivo) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // 🔥 CORREÇÃO: Verificar se o arquivo tem um caminho válido
    const filepath = arquivo.filepath || arquivo.path;
    if (!filepath) {
      return res.status(400).json({ error: 'Caminho do arquivo inválido' });
    }

    // Ler o arquivo CSV
    const fileContent = fs.readFileSync(filepath, 'utf8');
    const linhas = fileContent.split('\n').map(l => l.trim());

    const resultados = await processarCSV(linhas, user.id);

    return res.status(200).json({
      success: true,
      ...resultados,
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return res.status(500).json({ error: 'Erro ao importar arquivo: ' + error.message });
  }
}

async function processarCSV(linhas, usuarioId) {
  const membrosCache = new Map();
  const detalhes = [];
  let escalasImportadas = 0;
  let escalasAtualizadas = 0;
  let membrosCriados = 0;
  let erros = 0;

  // Mapeamento de nomes de membros que podem ter variações
  const mapaNomes = {
    'Pr': 'Pr. Rodrigo',
    'Pr Rodrigo': 'Pr. Rodrigo',
    'Pr. Rodrigo': 'Pr. Rodrigo',
    'Larry': 'Larry Carvalho',
    'Larry Carvalho': 'Larry Carvalho',
    'Willian': 'Willian Rogati',
    'Wilian': 'Willian Rogati',
    'Willian Rogati': 'Willian Rogati',
    'Ronaldo': 'Ronaldo Ocon',
    'Ronaldo Ocon': 'Ronaldo Ocon',
    'RonaldoFelipe': 'Ronaldo Ocon',
    'Tiago': 'Tiago Gonçalves',
    'Tiago Gonçalves': 'Tiago Gonçalves',
    'TIago': 'Tiago Gonçalves',
    'Cleber': 'Cleber Saraiva',
    'Cleber Saraiva': 'Cleber Saraiva',
    'Cleber /Tiago': 'Cleber Saraiva',
    'David': 'David Silva',
    'Daivid': 'David Silva',
    'Felipe': 'Felipe Santos',
    'Isa': 'Isa Souza',
    'Cleber ': 'Cleber Saraiva',
  };

  function normalizarNome(nome) {
    if (!nome) return null;
    const limpo = nome.trim().replace(/\s+/g, ' ');
    return mapaNomes[limpo] || limpo;
  }

  async function getMembroId(nome) {
    if (!nome) return null;
    const nomeNormalizado = normalizarNome(nome);
    if (!nomeNormalizado) return null;

    // Verificar cache
    if (membrosCache.has(nomeNormalizado)) {
      return membrosCache.get(nomeNormalizado);
    }

    // Buscar no banco
    let membro = await Membro.findOne({ nome: nomeNormalizado });
    if (!membro) {
      // Criar membro automaticamente
      membro = await Membro.create({
        nome: nomeNormalizado,
        criado_por: usuarioId,
      });
      membrosCriados++;
      detalhes.push(`➕ Membro criado: ${nomeNormalizado}`);
    }
    membrosCache.set(nomeNormalizado, membro._id);
    return membro._id;
  }

  // Percorrer as linhas do CSV
  let mesAtual = null;
  let anoAtual = null;
  let cabecalho = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha) continue;

    const colunas = linha.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    // Verificar se é um cabeçalho de mês
    if (colunas.length > 0 && colunas[0].includes('Escala do Louvor')) {
      const texto = colunas[0];
      const match = texto.match(/Escala do Louvor (\w+) (\d{4})/);
      if (match) {
        mesAtual = match[1];
        anoAtual = parseInt(match[2]);
        cabecalho = null;
        detalhes.push(`📅 Processando ${mesAtual} ${anoAtual}`);
        continue;
      }
    }

    // Verificar se é um cabeçalho de colunas
    if (colunas.includes('Dia') && colunas.includes('Dia da Semana') && colunas.includes('Voz')) {
      cabecalho = colunas;
      continue;
    }

    // Se não temos cabeçalho ou mês, pular
    if (!cabecalho || !mesAtual || !anoAtual) continue;

    // Pular linhas vazias ou com "ZELADORIA", "REUNIÃO"
    const diaStr = colunas[0] || '';
    if (!diaStr || diaStr.includes('ZELADORIA') || diaStr.includes('REUNIÃO')) continue;

    // Pular linhas que são cabeçalhos duplicados
    if (diaStr === 'Dia' || diaStr === 'Dia da Semana') continue;

    // Extrair dados da linha
    const dia = diaStr.trim();
    const diaSemana = colunas[1] || '';
    const voz = colunas[2] || '';
    const backVocal = colunas[3] || '';
    const violao = colunas[4] || '';
    const guitarra = colunas[5] || '';
    const baixo = colunas[6] || '';
    const bateria = colunas[7] || '';
    const teclado = colunas[8] || '';

    // Converter data: "4-fev." -> "2024-02-04"
    const dataConvertida = converterData(dia, mesAtual, anoAtual);
    if (!dataConvertida) {
      erros++;
      detalhes.push(`⚠️ Erro ao converter data: ${dia} (${mesAtual})`);
      continue;
    }

    // Buscar IDs dos membros
    const vozId = voz ? await getMembroId(voz) : null;
    const backVocalId = backVocal ? await getMembroId(backVocal) : null;
    const violaoId = violao ? await getMembroId(violao) : null;
    const guitarraId = guitarra ? await getMembroId(guitarra) : null;
    const baixoId = baixo ? await getMembroId(baixo) : null;
    const bateriaId = bateria ? await getMembroId(bateria) : null;
    const tecladoId = teclado ? await getMembroId(teclado) : null;

    // Preparar dados da escala
    const escalaData = {
      data: dataConvertida,
      dia_semana: diaSemana || '',
      voz_id: vozId,
      voz2_id: backVocalId,
      violao_id: violaoId,
      guitarra_id: guitarraId,
      baixo_id: baixoId,
      bateria_id: bateriaId,
      teclado_id: tecladoId,
      atualizado_por: usuarioId,
      atualizado_em: new Date(),
    };

    // Verificar se já existe escala para esta data
    const existe = await Escala.findOne({ data: dataConvertida });

    if (existe) {
      await Escala.updateOne({ data: dataConvertida }, { $set: escalaData });
      escalasAtualizadas++;
      detalhes.push(`🔄 Escala atualizada: ${dataConvertida} (${diaSemana})`);
    } else {
      escalaData.criado_por = usuarioId;
      await Escala.create(escalaData);
      escalasImportadas++;
      detalhes.push(`✅ Escala importada: ${dataConvertida} (${diaSemana})`);
    }
  }

  // Registrar log
  await Log.create({
    usuario_id: usuarioId,
    acao: 'importar_escala',
    descricao: `Importação de escalas: ${escalasImportadas} novas, ${escalasAtualizadas} atualizadas, ${membrosCriados} membros criados`,
    ip: '0.0.0.0',
  });

  return {
    escalasImportadas,
    escalasAtualizadas,
    membrosCriados,
    erros,
    detalhes,
  };
}

function converterData(diaStr, mes, ano) {
  // Extrair número do dia: "4-fev." -> "4"
  const match = diaStr.match(/^(\d+)/);
  if (!match) return null;
  const diaNum = parseInt(match[1]);

  // Mapear meses
  const meses = {
    'jan': 1, 'jan.': 1,
    'fev': 2, 'fev.': 2,
    'mar': 3, 'mar.': 3,
    'abr': 4, 'abr.': 4,
    'mai': 5, 'mai.': 5,
    'jun': 6, 'jun.': 6,
    'jul': 7, 'jul.': 7,
    'ago': 8, 'ago.': 8,
    'set': 9, 'set.': 9,
    'out': 10, 'out.': 10,
    'nov': 11, 'nov.': 11,
    'dez': 12, 'dez.': 12,
  };

  const mesNum = meses[mes.toLowerCase()];
  if (!mesNum) {
    console.error(`Mês não reconhecido: ${mes}`);
    return null;
  }

  // Garantir que o ano é 2024 (ou o ano do cabeçalho)
  const anoFinal = ano || 2024;

  // Formatar YYYY-MM-DD
  const dataStr = `${anoFinal}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
  return dataStr;
}