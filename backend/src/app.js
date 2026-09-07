const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const healthRoutes = require("./routes/health.routes");
const productRoutes = require("./routes/product.routes");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    })
  );
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/api", healthRoutes);
  app.use("/api/products", productRoutes);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ message: "Ruta no encontrada" });
  });

  // Manejador de errores centralizado
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
  });

  return app;
}

module.exports = { createApp };
