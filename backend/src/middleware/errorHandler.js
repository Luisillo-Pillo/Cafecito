const { HttpError } = require("../utils/httpError");

// 404 para rutas que no existen
function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

/**
 * Manejador de errores centralizado (4 argumentos, `err` primero).
 * - HttpError: errores esperados lanzados por los servicios (400/404/422...).
 * - JSON mal formado en el body: 400.
 * - Índice único duplicado que se coló (carrera entre dos requests): 400.
 * - Cualquier otra cosa: 500 genérico, con el detalle solo en consola.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.body);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0];
    return res.status(400).json({
      error: "Registro duplicado",
      details: [{ field, message: `Ya existe un registro con ese ${field}` }],
    });
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

module.exports = { notFoundHandler, errorHandler };
