require("dotenv/config");
const { createApp } = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT ?? 5000;

function warnAboutAuthConfig() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    console.warn("[auth] falta ADMIN_EMAIL o ADMIN_PASSWORD_HASH: solo podrán entrar admins registrados");
  }
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
    console.warn("[auth] falta AUTH_SECRET: las sesiones se cerrarán en cada reinicio del servidor");
  }
}

async function main() {
  warnAboutAuthConfig();
  await connectDB();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] escuchando en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[fatal] no se pudo iniciar el servidor:", err);
  process.exit(1);
});
