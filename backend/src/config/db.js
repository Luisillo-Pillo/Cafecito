const mongoose = require("mongoose");

async function connectDB(uri = process.env.DB_CONNECTION_STRING || process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno DB_CONNECTION_STRING (o MONGODB_URI). Revisa tu archivo .env (ver .env.example)."
    );
  }

  mongoose.connection.on("connected", () => {
    console.log(`[mongo] conectado a la base de datos: ${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] error de conexión:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] desconectado");
  });

  await mongoose.connect(uri);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
