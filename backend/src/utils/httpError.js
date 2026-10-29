class HttpError extends Error {
  constructor(status, error, extra = {}) {
    super(error);
    this.status = status;
    this.body = { error, ...extra };
  }
}

function validationError(details) {
  return new HttpError(422, "Validación fallida", { details });
}

function notFound(error, id) {
  return new HttpError(404, error, {
    id,
    details: [{ field: "id", message: "No encontramos ese registro; es posible que se haya eliminado." }],
  });
}

module.exports = { HttpError, validationError, notFound };
