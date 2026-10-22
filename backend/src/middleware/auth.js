const { ROLES } = require("../config/constants");

const VALID_ROLES = Object.values(ROLES);

// En producción solo valen los tokens definidos en el entorno (sin defaults de desarrollo)
function tokenRoles() {
  const isProd = process.env.NODE_ENV === "production";
  const adminToken = process.env.ADMIN_TOKEN || (isProd ? null : "dev-admin-token");
  const vendedorToken = process.env.VENDEDOR_TOKEN || (isProd ? null : "dev-vendedor-token");

  const map = new Map();
  if (adminToken) map.set(adminToken, ROLES.ADMIN);
  if (vendedorToken) map.set(vendedorToken, ROLES.VENDEDOR);
  return map;
}

const authError = (error, field, message) => ({ error, details: [{ field, message }] });

function resolveRole(req) {
  const authorization = req.get("Authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    const role = match && tokenRoles().get(match[1]);
    if (!role) {
      return {
        error: authError("Token inválido", "Authorization", "El token está mal formado o no es válido"),
      };
    }
    return { role };
  }

  const headerRole = req.get("X-User-Role")?.trim().toLowerCase();
  if (!headerRole) {
    return {
      error: authError(
        "Autenticación requerida",
        "Authorization",
        "Falta el token (Authorization: Bearer <token>) o el header X-User-Role"
      ),
    };
  }
  if (!VALID_ROLES.includes(headerRole)) {
    return {
      error: authError(
        "Credencial inválida",
        "X-User-Role",
        `Rol desconocido: "${headerRole}". Usa admin o vendedor`
      ),
    };
  }
  return { role: headerRole };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const { role, error } = resolveRole(req);
    if (error) return res.status(401).json(error);

    if (!allowedRoles.includes(role)) {
      const message = `Esta acción solo la puede hacer: ${allowedRoles.join(", ")}`;
      return res.status(403).json(authError("Permisos insuficientes", "role", message));
    }

    req.userRole = role;
    next();
  };
}

const adminOnly = requireRole(ROLES.ADMIN);
const staff = requireRole(ROLES.ADMIN, ROLES.VENDEDOR);

module.exports = { adminOnly, staff };
