require("dotenv/config");
const { createApp } = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT ?? 5000;

async function main() {
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
