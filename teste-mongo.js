const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://larrycarvalho2020_db_user:@cluster0.zdjlizp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  const client = new MongoClient(uri);

  try {
    console.log("Conectando...");
    await client.connect();

    console.log("✅ Conectado!");

    const admin = client.db().admin();
    const info = await admin.listDatabases();

    console.log(info);
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await client.close();
  }
}

main();