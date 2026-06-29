// migrate.js - Script de migração com MongoClient
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

// Configuração do MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://larrycarvalho2020_db_user:<db_password>@cluster0.zdjlizp.mongodb.net/?appName=Cluster0';
const MONGODB_DB = process.env.MONGODB_DB || 'escala_louvor';

// Função para conectar ao MongoDB usando MongoClient
async function connectMongoDB() {
  console.log('📡 Conectando ao MongoDB Atlas...');
  
  // Criar o cliente com as opções corretas
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Conectar ao servidor
    await client.connect();
    
    // Ping para confirmar a conexão
    await client.db("admin").command({ ping: 1 });
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    
    return client;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('  1. Verifique se a string de conexão está correta no .env');
    console.log('  2. Substitua <db_password> pela senha correta');
    console.log('  3. Libere o IP no MongoDB Atlas (Network Access)');
    console.log('  4. Verifique se o usuário tem permissões');
    throw error;
  }
}

// Função principal de migração
async function migrate() {
  console.log('🚀 Iniciando migração do MySQL para MongoDB...');
  console.log(`📊 Banco de dados destino: ${MONGODB_DB}`);
  
  let mysqlConnection;
  let mongoClient;
  
  try {
    // 1. Conectar ao MySQL
    console.log('📡 Conectando ao MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado ao MySQL!');

    // 2. Conectar ao MongoDB usando MongoClient
    mongoClient = await connectMongoDB();
    const db = mongoClient.db(MONGODB_DB);

    // 3. Verificar se já existem dados e perguntar se deseja limpar
    const collections = await db.listCollections().toArray();
    const hasData = collections.length > 0;
    
    if (hasData) {
      console.log('⚠️ O banco de dados já contém dados.');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Deseja limpar os dados existentes antes de migrar? (s/N) ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() === 's') {
        console.log('🧹 Limpando dados existentes...');
        for (const collection of collections) {
          await db.collection(collection.name).deleteMany({});
          console.log(`  ✅ Coleção "${collection.name}" limpa`);
        }
        console.log('✅ Dados limpos!');
      } else {
        console.log('⚠️ Mantendo dados existentes. Novos dados serão adicionados.');
      }
    }

    // 4. Migrar Habilidades
    console.log('📤 Migrando habilidades...');
    const [habilidades] = await mysqlConnection.query('SELECT * FROM habilidades');
    const habilidadeMap = {};
    
    // Verificar se há habilidades
    if (habilidades.length === 0) {
      console.log('⚠️ Nenhuma habilidade encontrada. Criando habilidades padrão...');
      const habilidadesPadrao = ['Voz', 'Voz2', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado'];
      for (const nome of habilidadesPadrao) {
        const result = await db.collection('habilidades').insertOne({ 
          nome, 
          createdAt: new Date() 
        });
        habilidadeMap[`padrao_${nome}`] = result.insertedId;
        console.log(`  ✅ Habilidade "${nome}" criada`);
      }
    } else {
      for (const hab of habilidades) {
        const result = await db.collection('habilidades').insertOne({ 
          nome: hab.nome,
          createdAt: new Date(),
        });
        habilidadeMap[hab.id] = result.insertedId;
        console.log(`  ✅ Habilidade "${hab.nome}" migrada`);
      }
    }
    console.log(`✅ ${Object.keys(habilidadeMap).length} habilidades migradas/criadas!`);

    // 5. Migrar Usuários
    console.log('📤 Migrando usuários...');
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await db.collection('usuarios').insertOne(usuarioData);
      usuarioMap[user.id] = result.insertedId;
      console.log(`  ✅ Usuário "${user.nome}" migrado`);
    }
    console.log(`✅ ${usuarios.length} usuários migrados!`);

    // 6. Migrar Membros
    console.log('📤 Migrando membros...');
    const [membros] = await mysqlConnection.query('SELECT * FROM membros');
    const membroMap = {};
    
    for (const m of membros) {
      // Buscar habilidades do membro
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await db.collection('membros').insertOne(membroData);
      membroMap[m.id] = result.insertedId;
      console.log(`  ✅ Membro "${m.nome}" migrado`);
    }
    console.log(`✅ ${membros.length} membros migrados!`);

    // 7. Migrar Escalas
    console.log('📤 Migrando escalas...');
    const [escalas] = await mysqlConnection.query('SELECT * FROM escala');
    
    let escalasMigradas = 0;
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('escala').insertOne(escalaData);
      escalasMigradas++;
      if (escalasMigradas % 10 === 0) {
        console.log(`  ✅ ${escalasMigradas} escalas migradas...`);
      }
    }
    console.log(`✅ ${escalas.length} escalas migradas!`);

    // 8. Migrar Logs
    console.log('📤 Migrando logs...');
    const [logs] = await mysqlConnection.query('SELECT * FROM logs');
    
    let logsMigrados = 0;
    for (const log of logs) {
      const logData = {
        usuario_id: usuarioMap[log.usuario_id] || null,
        acao: log.acao || 'sistema',
        descricao: log.descricao || '',
        ip: log.ip || '0.0.0.0',
        data_hora: log.data_hora ? new Date(log.data_hora) : new Date(),
        createdAt: new Date(),
      };
      
      await db.collection('logs').insertOne(logData);
      logsMigrados++;
    }
    console.log(`✅ ${logs.length} logs migrados!`);

    // 9. Criar índices para melhor performance
    console.log('📤 Criando índices no MongoDB...');
    await db.collection('usuarios').createIndex({ email: 1 }, { unique: true });
    await db.collection('membros').createIndex({ usuario_id: 1 });
    await db.collection('membros').createIndex({ nome: 1 });
    await db.collection('escala').createIndex({ data: 1 });
    await db.collection('escala').createIndex({ data: 1, dia_semana: 1 });
    await db.collection('logs').createIndex({ data_hora: -1 });
    await db.collection('logs').createIndex({ usuario_id: 1 });
    console.log('✅ Índices criados!');

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Resumo:`);
    console.log(`  - Habilidades: ${habilidades.length || 7}`);
    console.log(`  - Usuários: ${usuarios.length}`);
    console.log(`  - Membros: ${membros.length}`);
    console.log(`  - Escalas: ${escalas.length}`);
    console.log(`  - Logs: ${logs.length}`);
    console.log(`\n📌 Banco de dados: ${MONGODB_DB}`);

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Fechar conexões
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('🔌 Conexão MySQL fechada.');
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

// Função para testar a conexão com MongoDB
async function testConnection() {
  console.log('🔍 Testando conexão com MongoDB Atlas...');
  
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log('✅ Conexão com MongoDB Atlas funcionando!');
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.log('\n🔧 Verifique:');
    console.log('  1. A senha no .env está correta?');
    console.log('  2. O IP está liberado no MongoDB Atlas?');
    console.log('  3. O usuário existe e tem permissões?');
    return false;
  }
}

// Executar migração
async function main() {
  checkEnv();
  
  // Carregar variáveis de ambiente
  require('dotenv').config();
  
  // Atualizar a URI com a senha do .env
  const password = process.env.MONGODB_PASSWORD || '';
  if (password) {
    process.env.MONGODB_URI = process.env.MONGODB_URI.replace('<db_password>', password);
  }
  
  console.log('🔍 Verificando conexão...');
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('\n❌ Não foi possível conectar ao MongoDB. Corrija os problemas e tente novamente.');
    console.log('💡 Dica: Substitua <db_password> pela senha correta no arquivo .env');
    process.exit(1);
  }
  
  // Perguntar se deseja continuar
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

// Executar
main().catch(console.error);