// Express 4 no envía los rechazos de promesas al middleware de errores
const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

module.exports = { asyncHandler };
