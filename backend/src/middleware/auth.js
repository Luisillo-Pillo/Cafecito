const { ROLES } = require("../config/constants");
const { verifySessionToken } = require("../services/auth.service");

const VALID_ROLES = Object.values(ROLES);

// El rol admin nunca tiene token por default: se obtiene con POST /api/auth/login o con un
// ADMIN_TOKEN definido explícitamente en el entorno (CI, Postman)
function staticTokenRoles() {
  const isProd = process.env.NODE_ENV === "production";
  const vendedorToken = process.env.VENDEDOR_TOKEN || (isProd ? null : "dev-vendedor-token");

  const map = new Map();
  if (process.env.ADMIN_TOKEN) map.set(process.env.ADMIN_TOKEN, ROLES.ADMIN);
  if (vendedorToken) map.set(vendedorToken, ROLES.VENDEDOR);
  return map;
}

const authError = (error, field, message) => ({ error, details: [{ field, message }] });

function resolveRole(req) {
  const authorization = req.get("Authorization");
  if (authorization) {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization.trim())?.[1];
    const session = token ? verifySessionToken(token) : null;
    const role = session?.role ?? (token && staticTokenRoles().get(token));
    if (!role) {
      return {
        error: authError("Token inválido", "Authorization", "El token está mal formado o no es válido"),
      };
    }
    return { role, email: session?.email ?? null };
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
  if (headerRole === ROLES.ADMIN) {
    return {
      error: authError(
        "Inicio de sesión requerido",
        "Authorization",
        "Para actuar como administrador inicia sesión (POST /api/auth/login) y envía el token Bearer"
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
    const { role, email, error } = resolveRole(req);
    if (error) return res.status(401).json(error);

    if (!allowedRoles.includes(role)) {
      const message = `Esta acción solo la puede hacer: ${allowedRoles.join(", ")}`;
      return res.status(403).json(authError("Permisos insuficientes", "role", message));
    }

    req.userRole = role;
    req.userEmail = email ?? null;
    next();
  };
}

const adminOnly = requireRole(ROLES.ADMIN);
const staff = requireRole(ROLES.ADMIN, ROLES.VENDEDOR);

module.exports = { adminOnly, staff };
