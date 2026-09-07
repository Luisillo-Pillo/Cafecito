const mongoose = require("mongoose");

/**
 * Conecta a MongoDB Atlas usando la connection string definida en MONGODB_URI.
 * Lanza el proceso si la variable no existe, para fallar rápido en vez de
 * arrancar un servidor sin base de datos.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Revisa tu archivo .env (ver .env.example)."
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
