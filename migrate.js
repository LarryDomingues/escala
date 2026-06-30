// migrate.js - Versão Corrigida
const mysql = require('mysql2/promise');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Configuração do MySQL Local
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Sua senha do MySQL
  database: 'escala_louvor',
  port: 3306,
};

// 🔥 CORREÇÃO: Pegar a URI corretamente do .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://larrycarvalho2020_db_user:SUA_SENHA@cluster0.zdjlizp.mongodb.net/?appName=Cluster0';
const MONGODB_DB = process.env.MONGODB_DB || 'escala_louvor';

console.log('🔍 DEBUG:');
console.log(`MONGODB_URI: ${MONGODB_URI.substring(0, 50)}...`);
console.log(`MONGODB_DB: ${MONGODB_DB}`);

// Função para testar conexão com MongoDB
async function testarConexaoMongoDB() {
  console.log('\n🔍 Testando conexão com MongoDB Atlas...');
  
  // Verificar se a URI é válida
  if (!MONGODB_URI || MONGODB_URI === 'mongodb+srv://larrycarvalho2020_db_user:SUA_SENHA@cluster0.zdjlizp.mongodb.net/?appName=Cluster0') {
    console.log('❌ A senha não foi configurada!');
    console.log('\n🔧 SOLUÇÃO:');
    console.log('  1. Abra o arquivo .env');
    console.log('  2. Substitua SUA_SENHA pela senha correta do MongoDB Atlas');
    console.log('  3. Execute o script novamente');
    return false;
  }
  
  // Verificar se a URI começa com o prefixo correto
  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    console.log(`❌ URI inválida: ${MONGODB_URI.substring(0, 50)}...`);
    console.log('   A URI deve começar com "mongodb://" ou "mongodb+srv://"');
    return false;
  }
  
  console.log(`📡 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Oculta credenciais
  
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log('✅ Conexão com MongoDB Atlas bem-sucedida!');
    await client.close();
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    console.log('\n🔧 SOLUÇÕES:');
    console.log('  1. Verifique se a senha está correta no arquivo .env');
    console.log('  2. Libere o IP 0.0.0.0/0 no MongoDB Atlas (Network Access)');
    console.log('  3. Verifique se o usuário existe e tem permissões');
    console.log('  4. Verifique se o cluster está ativo');
    return false;
  }
}

// Função principal de migração
async function migrate() {
  console.log('🚀 Iniciando migração do MySQL para MongoDB...');
  console.log(`📊 Banco de dados destino: ${MONGODB_DB}`);
  
  let mysqlConnection;
  let mongoClient;
  
  try {
    // 1. Testar conexão com MongoDB primeiro
    const mongoOk = await testarConexaoMongoDB();
    if (!mongoOk) {
      console.log('\n❌ Não foi possível conectar ao MongoDB. Corrija os problemas e tente novamente.');
      console.log('\n💡 Como obter a string de conexão correta:');
      console.log('   1. Acesse https://cloud.mongodb.com/');
      console.log('   2. Clique em "Connect" no seu cluster');
      console.log('   3. Selecione "Connect your application"');
      console.log('   4. Copie a string de conexão');
      console.log('   5. Cole no arquivo .env');
      console.log('   6. Substitua <password> pela senha correta');
      return;
    }

    // 2. Conectar ao MySQL
    console.log('\n📡 Conectando ao MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado ao MySQL!');

    // 3. Conectar ao MongoDB
    console.log('\n📡 Conectando ao MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DB);
    console.log('✅ Conectado ao MongoDB!');

    // 4. Verificar e limpar dados
    console.log('\n🧹 Verificando dados existentes...');
    const collections = await db.listCollections().toArray();
    if (collections.length > 0) {
      console.log(`⚠️ Encontradas ${collections.length} coleções.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Deseja limpar os dados existentes? (s/N) ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() === 's') {
        for (const collection of collections) {
          await db.collection(collection.name).deleteMany({});
          console.log(`  ✅ Coleção "${collection.name}" limpa`);
        }
        console.log('✅ Dados limpos!');
      }
    }

    // 5. Migrar Habilidades
    console.log('\n📤 Migrando habilidades...');
    const [habilidades] = await mysqlConnection.query('SELECT * FROM habilidades');
    const habilidadeMap = {};
    
    if (habilidades.length === 0) {
      console.log('⚠️ Nenhuma habilidade encontrada. Criando habilidades padrão...');
      const habilidadesPadrao = ['Voz', 'Voz2', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado'];
      for (const nome of habilidadesPadrao) {
        const result = await db.collection('habilidades').insertOne({ nome });
        habilidadeMap[`padrao_${nome}`] = result.insertedId;
        console.log(`  ✅ Habilidade "${nome}" criada`);
      }
    } else {
      for (const hab of habilidades) {
        const result = await db.collection('habilidades').insertOne({ nome: hab.nome });
        habilidadeMap[hab.id] = result.insertedId;
        console.log(`  ✅ Habilidade "${hab.nome}" migrada`);
      }
    }
    console.log(`✅ ${Object.keys(habilidadeMap).length} habilidades migradas/criadas!`);

    // 6. Migrar Usuários
    console.log('\n📤 Migrando usuários...');
    const [usuarios] = await mysqlConnection.query('SELECT * FROM usuarios');
    const usuarioMap = {};
    
    for (const user of usuarios) {
      const usuarioData = {
        nome: user.nome,
        email: user.email,
        senha: user.senha,
        status: user.status || 'ativo',
        nivel: user.nivel || 'membro',
        ultimo_login: user.ultimo_login ? new Date(user.ultimo_login) : null,
        data_cadastro: user.data_cadastro ? new Date(user.data_cadastro) : new Date(),
        token_ativacao: user.token_ativacao || null,
        token_recuperacao: user.token_recuperacao || null,
        data_recuperacao: user.data_recuperacao ? new Date(user.data_recuperacao) : null,
      };
      
      const result = await db.collection('usuarios').insertOne(usuarioData);
      usuarioMap[user.id] = result.insertedId;
      console.log(`  ✅ Usuário "${user.nome}" migrado`);
    }
    console.log(`✅ ${usuarios.length} usuários migrados!`);

    // 7. Migrar Membros
    console.log('\n📤 Migrando membros...');
    const [membros] = await mysqlConnection.query('SELECT * FROM membros');
    const membroMap = {};
    
    for (const m of membros) {
      const [membroHabilidades] = await mysqlConnection.query(
        'SELECT habilidade_id FROM membro_habilidade WHERE membro_id = ?',
        [m.id]
      );
      
      const habilidadeIds = membroHabilidades
        .map(mh => habilidadeMap[mh.habilidade_id])
        .filter(id => id);

      const membroData = {
        usuario_id: usuarioMap[m.usuario_id] || null,
        nome: m.nome,
        celular: m.celular || '',
        email: m.email || '',
        data_nascimento: m.data_nascimento || '',
        habilidade_ids: habilidadeIds,
        criado_por: usuarioMap[m.criado_por] || null,
        criado_em: m.criado_em ? new Date(m.criado_em) : new Date(),
      };
      
      const result = await db.collection('membros').insertOne(membroData);
      membroMap[m.id] = result.insertedId;
      console.log(`  ✅ Membro "${m.nome}" migrado`);
    }
    console.log(`✅ ${membros.length} membros migrados!`);

    // 8. Migrar Escalas
    console.log('\n📤 Migrando escalas...');
    const [escalas] = await mysqlConnection.query('SELECT * FROM escala');
    
    for (const e of escalas) {
      const escalaData = {
        data: e.data,
        dia_semana: e.dia_semana,
        voz_id: membroMap[e.voz_id] || null,
        voz2_id: membroMap[e.voz2_id] || null,
        violao_id: membroMap[e.violao_id] || null,
        guitarra_id: membroMap[e.guitarra_id] || null,
        baixo_id: membroMap[e.baixo_id] || null,
        bateria_id: membroMap[e.bateria_id] || null,
        teclado_id: membroMap[e.teclado_id] || null,
        link_youtube: e.link_youtube || null,
        criado_por: usuarioMap[e.criado_por] || null,
        criado_em: e.criado_em ? new Date(e.criado_em) : new Date(),
        atualizado_por: usuarioMap[e.atualizado_por] || null,
        atualizado_em: e.atualizado_em ? new Date(e.atualizado_em) : null,
      };
      
      await db.collection('escala').insertOne(escalaData);
      console.log(`  ✅ Escala do dia ${e.data} migrada`);
    }
    console.log(`✅ ${escalas.length} escalas migradas!`);

    // 9. Migrar Logs
    console.log('\n📤 Migrando logs...');
    const [logs] = await mysqlConnection.query('SELECT * FROM logs');
    
    for (const log of logs) {
      const logData = {
        usuario_id: usuarioMap[log.usuario_id] || null,
        acao: log.acao || 'sistema',
        descricao: log.descricao || '',
        ip: log.ip || '0.0.0.0',
        data_hora: log.data_hora ? new Date(log.data_hora) : new Date(),
      };
      
      await db.collection('logs').insertOne(logData);
      console.log(`  ✅ Log "${log.acao}" migrado`);
    }
    console.log(`✅ ${logs.length} logs migrados!`);

    // 10. Criar índices
    console.log('\n📤 Criando índices...');
    try {
      await db.collection('usuarios').createIndex({ email: 1 }, { unique: true });
      await db.collection('membros').createIndex({ usuario_id: 1 });
      await db.collection('membros').createIndex({ nome: 1 });
      await db.collection('escala').createIndex({ data: 1 });
      await db.collection('logs').createIndex({ data_hora: -1 });
      await db.collection('logs').createIndex({ usuario_id: 1 });
      console.log('✅ Índices criados!');
    } catch (error) {
      console.log(`⚠️ Erro ao criar índices: ${error.message}`);
    }

    // 11. Resumo
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Resumo:`);
    console.log(`  - Habilidades: ${habilidades.length || 7}`);
    console.log(`  - Usuários: ${usuarios.length}`);
    console.log(`  - Membros: ${membros.length}`);
    console.log(`  - Escalas: ${escalas.length}`);
    console.log(`  - Logs: ${logs.length}`);
    console.log(`\n📌 Banco de dados: ${MONGODB_DB}`);

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('\n🔌 Conexão MySQL fechada.');
    }
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 Conexão MongoDB fechada.');
    }
  }
}

// Função para verificar o arquivo .env
function checkEnv() {
  const fs = require('fs');
  if (!fs.existsSync('.env')) {
    console.log('📄 Arquivo .env não encontrado. Criando...');
    fs.writeFileSync('.env', `
MONGODB_URI=mongodb+srv://larrycarvalho2020_db_user:SUA_SENHA@cluster0.zdjlizp.mongodb.net/?appName=Cluster0
MONGODB_DB=escala_louvor
JWT_SECRET=seu_jwt_secret_aqui
    `.trim());
    console.log('⚠️ Arquivo .env criado!');
    console.log('⚠️ Substitua SUA_SENHA pela senha correta do MongoDB Atlas.');
    console.log('⚠️ Depois execute o script novamente.');
    process.exit(0);
  }
}

// Executar
async function main() {
  checkEnv();
  
  // Carregar variáveis de ambiente
  require('dotenv').config();
  
  console.log('🔍 Verificando configuração...');
  console.log(`📡 URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@') : 'Não definida'}`);
  console.log(`📡 DB: ${process.env.MONGODB_DB || 'Não definido'}`);
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const answer = await new Promise((resolve) => {
    readline.question('\nDeseja continuar com a migração? (s/N) ', resolve);
  });
  readline.close();
  
  if (answer.toLowerCase() === 's') {
    await migrate();
  } else {
    console.log('❌ Migração cancelada.');
  }
}

main().catch(console.error);