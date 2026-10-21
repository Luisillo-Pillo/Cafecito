/**
 * Error con status HTTP y cuerpo JSON listos para responder.
 * Los servicios lanzan HttpError y el middleware de errores (errorHandler.js)
 * lo traduce en la respuesta, siguiendo la estructura del contrato de API:
 *   { error: "Mensaje corto", details: [ { field?, message, ... } ] }
 */
class HttpError extends Error {
  constructor(status, error, extra = {}) {
    super(error);
    this.status = status;
    this.body = { error, ...extra };
  }
}

// 422: validación de campos (falta un campo, formato inválido, etc.)
function validationError(details) {
  return new HttpError(422, "Validación fallida", { details });
}

// 404: recurso inexistente ({ error, id })
function notFound(error, id) {
  return new HttpError(404, error, { id });
}

module.exports = { HttpError, validationError, notFound };
