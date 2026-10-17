const mongoose = require("mongoose");
const { HttpError } = require("./httpError");

const isValidId = (value) => typeof value === "string" && mongoose.isValidObjectId(value);

const isPositiveInteger = (value) => Number.isInteger(value) && value >= 1;

// Redondeo monetario a 2 decimales (evita 13.774999... en totales y descuentos)
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Correo "usuario@dominio.tld" o teléfono que empieza con + seguido de 8 a 15 dígitos
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+\d{8,15}$/;

/**
 * Normaliza phoneOrEmail: correos en minúsculas; teléfonos sin espacios ni guiones.
 * Devuelve null si no es ni correo ni teléfono válido.
 */
function normalizePhoneOrEmail(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (EMAIL_REGEX.test(trimmed)) return trimmed.toLowerCase();
  const phone = trimmed.replace(/[\s\-()]/g, "");
  if (PHONE_REGEX.test(phone)) return phone;
  return null;
}

/**
 * Lee page/limit del query string. Si son inválidos lanza 400 con el detalle
 * de cada parámetro (ver edge-cases: "Parámetros de paginación inválidos").
 */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const details = [];

  let page = 1;
  if (query.page !== undefined) {
    page = Number(query.page);
    if (!Number.isInteger(page) || page < 1) {
      details.push({
        field: "page",
        value: query.page,
        message: "page debe ser un entero mayor o igual a 1",
      });
    }
  }

  let limit = defaultLimit;
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
      details.push({
        field: "limit",
        value: query.limit,
        message: `limit debe ser un entero entre 1 y ${maxLimit}`,
      });
    }
  }

  if (details.length > 0) {
    throw new HttpError(400, "Parámetros de consulta inválidos", { details });
  }

  return { page, limit, skip: (page - 1) * limit };
}

// Respuesta paginada estándar del contrato: { data, total, page, limit }
function paginated(data, total, { page, limit }, emptyMessage) {
  const body = { data, total, page, limit };
  if (total === 0 && emptyMessage) body.message = emptyMessage;
  return body;
}

module.exports = {
  isValidId,
  isPositiveInteger,
  round2,
  escapeRegex,
  normalizePhoneOrEmail,
  parsePagination,
  paginated,
};
