const { HttpError } = require("../utils/httpError");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Ruta no encontrada",
    details: [{ field: "path", message: `${req.method} ${req.originalUrl} no existe` }],
  });
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.body);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "El cuerpo de la petición no es JSON válido",
      details: [{ field: "body", message: "Revisa la sintaxis del JSON enviado" }],
    });
  }

  if (err.expose && err.status >= 400 && err.status < 500) {
    return res
      .status(err.status)
      .json({ error: err.message, details: [{ field: "body", message: err.message }] });
  }

  // Índice único violado por dos requests simultáneos que pasaron la validación
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0];
    return res.status(400).json({
      error: "Registro duplicado",
      details: [{ field, message: `Ya existe un registro con ese ${field}` }],
    });
  }

  console.error(err);
  res.status(500).json({
    error: "Error interno del servidor",
    details: [{ field: null, message: "No se guardó ningún cambio; intenta de nuevo" }],
  });
}

module.exports = { notFoundHandler, errorHandler };
