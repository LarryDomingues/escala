// pages/api/importar-escala.js
import connectDB from '../../lib/mongodb';
import { Membro, Escala, Log } from '../../lib/models';
import { getUserFromToken } from '../../lib/auth';
import formidable from 'formidable';
import fs from 'fs';

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

    // Configurar formidable para aceitar o arquivo
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

    // 🔥 CORREÇÃO: Verificar se o arquivo é um array
    let arquivo = files.arquivo;
    if (!arquivo) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Se for um array, pegar o primeiro elemento
    if (Array.isArray(arquivo)) {
      if (arquivo.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }
      arquivo = arquivo[0];
    }

    // Verificar se o arquivo tem caminho
    const filePath = arquivo.filepath || arquivo.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Caminho do arquivo não encontrado' });
    }

    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'Arquivo temporário não encontrado' });
    }

    // Ler o arquivo CSV
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const linhas = fileContent.split('\n').map(l => l.trim());

    console.log(`[importar-escala] Arquivo lido: ${linhas.length} linhas, mês extraído do CSV`);
    const resultados = await processarCSV(linhas, user.id);
    console.log(`[importar-escala] Resultado final:`, JSON.stringify(resultados));

    // Limpar arquivo temporário
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('Não foi possível remover arquivo temporário:', e.message);
    }

    return res.status(200).json({
      success: true,
      ...resultados,
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return res.status(500).json({ 
      error: 'Erro ao importar arquivo: ' + error.message 
    });
  }
}

async function processarCSV(linhas, usuarioId) {
  const membrosCache = new Map();
  const detalhes = [];
  let escalasImportadas = 0;
  let escalasAtualizadas = 0;
  let membrosCriados = 0;
  let erros = 0;

  // Mapeamento de nomes de membros
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
    'Ronaldo Ocon': 'Ronaldo Ocon',
    'Thiago': 'Tiago Gonçalves',
    'Thiago Gonçalves': 'Tiago Gonçalves',
    'Thiago': 'Tiago Gonçalves',
    'Cleber': 'Cleber Saraiva',
    'Cleber Saraiva': 'Cleber Saraiva',
    'Cleber Saraiva': 'Cleber Saraiva',
    'David': 'David Gonçalves',
    'Daivid': 'David Gonçalves',
    'Felipe': 'Felipe Saraiva',
    'Elo':'Eloisa Rogati',
    'Isa': 'Isadora Pompiani',
    'Isadora':'Isadora Pompiani',
    'Cleber': 'Cleber Saraiva',
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

    if (membrosCache.has(nomeNormalizado)) {
      return membrosCache.get(nomeNormalizado);
    }

    let membro = await Membro.findOne({ nome: nomeNormalizado });
    if (!membro) {
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

  let mesAtual = null;
  let anoAtual = null;
  let cabecalho = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha) continue;

    const delim = linha.includes(';') ? ';' : ',';
    const colunas = linha.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));

    if (colunas.length > 0 && colunas[0].includes('Escala do Louvor')) {
      const texto = colunas[0];
      const match = texto.match(/Escala do Louvor (\w+) (\d{4})/);
      if (match) {
        mesAtual = match[1];
        anoAtual = parseInt(match[2]);
        cabecalho = null;
        console.log(`[importar-escala] Cabeçalho detectado: mês="${mesAtual}", ano=${anoAtual}`);
        detalhes.push(`📅 Processando ${mesAtual} ${anoAtual}`);
        continue;
      } else {
        console.log(`[importar-escala] Linha 'Escala do Louvor' não correspondeu ao regex: "${texto}"`);
      }
    }

    if (colunas.includes('Dia') && colunas.includes('Dia da Semana') && colunas.includes('Voz')) {
      cabecalho = colunas;
      console.log(`[importar-escala] Cabeçalho de colunas detectado: ${cabecalho.join(', ')}`);
      continue;
    }

    if (!cabecalho || !mesAtual || !anoAtual) {
      console.log(`[importar-escala] Linha ignorada (sem cabeçalho/mês/ano): linha ${i + 1} — "${linha.slice(0, 60)}"`);
      continue;
    }

    const diaStr = colunas[0] || '';
    if (!diaStr || diaStr.includes('ZELADORIA') || diaStr.includes('REUNIÃO')) continue;
    if (diaStr === 'Dia' || diaStr === 'Dia da Semana') continue;

    const dia = diaStr.trim();
    const diaSemana = colunas[1] || '';
    const voz = colunas[2] || '';
    const backVocal = colunas[3] || '';
    const violao = colunas[4] || '';
    const guitarra = colunas[5] || '';
    const baixo = colunas[6] || '';
    const bateria = colunas[7] || '';
    const teclado = colunas[8] || '';

    const dataConvertida = converterData(dia, mesAtual, anoAtual);
    if (!dataConvertida) {
      erros++;
      console.log(`[importar-escala] ERRO ao converter data: dia="${dia}", mes="${mesAtual}", ano=${anoAtual}`);
      detalhes.push(`⚠️ Erro ao converter data: ${dia} (${mesAtual}). Mês "${mesAtual}" não encontrado no mapa de meses.`);
      continue;
    }

    const vozId = voz ? await getMembroId(voz) : null;
    const backVocalId = backVocal ? await getMembroId(backVocal) : null;
    const violaoId = violao ? await getMembroId(violao) : null;
    const guitarraId = guitarra ? await getMembroId(guitarra) : null;
    const baixoId = baixo ? await getMembroId(baixo) : null;
    const bateriaId = bateria ? await getMembroId(bateria) : null;
    const tecladoId = teclado ? await getMembroId(teclado) : null;

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

    const existe = await Escala.findOne({ data: dataConvertida });

    if (existe) {
      await Escala.updateOne({ data: dataConvertida }, { $set: escalaData });
      escalasAtualizadas++;
      console.log(`[importar-escala] Atualizada: ${dataConvertida}`);
      detalhes.push(`🔄 Escala atualizada: ${dataConvertida} (${diaSemana})`);
    } else {
      escalaData.criado_por = usuarioId;
      await Escala.create(escalaData);
      escalasImportadas++;
      console.log(`[importar-escala] Criada: ${dataConvertida}`);
      detalhes.push(`✅ Escala importada: ${dataConvertida} (${diaSemana})`);
    }
  }

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
  const match = diaStr.match(/^(\d+)/);
  if (!match) return null;
  const diaNum = parseInt(match[1]);

  const meses = {
    'jan': 1, 'jan.': 1, 'janeiro': 1,
    'fev': 2, 'fev.': 2, 'fevereiro': 2,
    'mar': 3, 'mar.': 3, 'março': 3, 'marco': 3,
    'abr': 4, 'abr.': 4, 'abril': 4,
    'mai': 5, 'mai.': 5, 'maio': 5,
    'jun': 6, 'jun.': 6, 'junho': 6,
    'jul': 7, 'jul.': 7, 'julho': 7,
    'ago': 8, 'ago.': 8, 'agosto': 8,
    'set': 9, 'set.': 9, 'setembro': 9,
    'out': 10, 'out.': 10, 'outubro': 10,
    'nov': 11, 'nov.': 11, 'novembro': 11,
    'dez': 12, 'dez.': 12, 'dezembro': 12,
  };

  const mesLower = mes.toLowerCase();
  const mesNum = meses[mesLower];
  if (!mesNum) {
    console.log(`[importar-escala/converterData] Mês não reconhecido: "${mes}" (lower: "${mesLower}")`);
    return null;
  }

  const anoFinal = ano || 2024;
  const dataStr = `${anoFinal}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
  return dataStr;
}