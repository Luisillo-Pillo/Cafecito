const { ROLES } = require("../config/constants");

const VALID_ROLES = Object.values(ROLES);

/**
 * Tokens de la autenticación básica del MVP ("Decisiones ya tomadas" del Kit).
 * Se configuran en .env (ADMIN_TOKEN / VENDEDOR_TOKEN). En desarrollo y pruebas
 * hay valores por default para que el proyecto funcione sin configurar nada;
 * en producción solo valen los definidos en el entorno.
 */
function tokenRoles() {
  const isProd = process.env.NODE_ENV === "production";
  const adminToken = process.env.ADMIN_TOKEN || (isProd ? null : "dev-admin-token");
  const vendedorToken = process.env.VENDEDOR_TOKEN || (isProd ? null : "dev-vendedor-token");

  const map = new Map();
  if (adminToken) map.set(adminToken, ROLES.ADMIN);
  if (vendedorToken) map.set(vendedorToken, ROLES.VENDEDOR);
  return map;
}

/**
 * Obtiene el rol de la petición. Acepta dos formas (ambas válidas en el Kit):
 * 1. `Authorization: Bearer <token>` → rol según el token (Postman, REST Client).
 * 2. `X-User-Role: admin | vendedor` → "header estático para desarrollo" (lo usa el frontend).
 * Devuelve { role } o { error } con la respuesta 401 del contrato.
 */
function resolveRole(req) {
  const authorization = req.get("Authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    const role = match && tokenRoles().get(match[1]);
    if (!role) {
      return {
        error: { error: "Token inválido", message: "El token está mal formado o no es válido" },
      };
    }
    return { role };
  }

  const headerRole = req.get("X-User-Role")?.trim().toLowerCase();
  if (!headerRole) {
    return {
      error: {
        error: "Autenticación requerida",
        message: "Falta el token (Authorization: Bearer <token>) o el header X-User-Role",
      },
    };
  }
  if (!VALID_ROLES.includes(headerRole)) {
    return {
      error: {
        error: "Credencial inválida",
        message: `Rol desconocido: "${headerRole}". Usa admin o vendedor`,
      },
    };
  }
  return { role: headerRole };
}

/**
 * Middleware de autorización (matriz de permisos del contrato):
 * sin credencial o credencial inválida → 401; rol sin permiso → 403.
 *
 * Uso: router.post("/", requireRole(ROLES.ADMIN), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const { role, error } = resolveRole(req);
    if (error) return res.status(401).json(error);

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Permisos insuficientes",
        message: `Esta acción solo la puede hacer: ${allowedRoles.join(", ")}`,
      });
    }

    req.userRole = role;
    next();
  };
}

// Atajos para las combinaciones de la matriz de permisos del contrato
const adminOnly = requireRole(ROLES.ADMIN);
const staff = requireRole(ROLES.ADMIN, ROLES.VENDEDOR);

module.exports = { requireRole, adminOnly, staff };
