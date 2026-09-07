/**
 * Envuelve un handler async para que cualquier rechazo de la promesa
 * llegue al middleware de errores en vez de tumbar el proceso
 * (Express 4 no hace esto automáticamente).
 */
const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

module.exports = { asyncHandler };
