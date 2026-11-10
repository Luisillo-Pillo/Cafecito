const crypto = require("node:crypto");
const { promisify } = require("node:util");
const Admin = require("../models/Admin");
const { ROLES } = require("../config/constants");
const { HttpError, validationError } = require("../utils/httpError");

const scrypt = promisify(crypto.scrypt);
const SESSION_HOURS = 8;

let fallbackSecret;
let dummyHash;

// Sin AUTH_SECRET se usa uno aleatorio: es seguro, pero las sesiones se pierden al reiniciar
function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  fallbackSecret ??= crypto.randomBytes(32).toString("hex");
  return fallbackSecret;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const sign = (payload) => crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

function createSessionToken(email) {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const session = { role: ROLES.ADMIN, email, exp: expiresAt };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt).toISOString() };
}

function verifySessionToken(token) {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

// El admin principal vive en .env (siempre puede entrar); los demás se registran en la colección admins
async function findAdminCredentials(email) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (ownerEmail && email === ownerEmail && process.env.ADMIN_PASSWORD_HASH) {
    return { email: ownerEmail, passwordHash: process.env.ADMIN_PASSWORD_HASH };
  }
  const admin = await Admin.findOne({ email });
  return admin ? { email: admin.email, passwordHash: admin.passwordHash } : null;
}

// Un token firmado sigue siendo válido hasta que vence; para que eliminar a un administrador
// cierre sus sesiones abiertas, cada petición confirma que la cuenta todavía existe
async function isActiveAdmin(email) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (ownerEmail && email === ownerEmail) return true;
  return Boolean(await Admin.exists({ email }));
}

async function login(body = {}) {
  const { email, password } = body;
  const details = [];
  if (typeof email !== "string" || email.trim() === "") {
    details.push({ field: "email", message: "Escribe tu correo." });
  }
  if (typeof password !== "string" || password === "") {
    details.push({ field: "password", message: "Escribe tu contraseña." });
  }
  if (details.length > 0) throw validationError(details);

  const credentials = await findAdminCredentials(email.trim().toLowerCase());
  // Sin cuenta se verifica contra un hash de relleno, para no revelar por tiempo qué correos existen
  dummyHash ??= await hashPassword(crypto.randomUUID());
  const passwordOk = await verifyPassword(password, credentials?.passwordHash ?? dummyHash);
  if (!credentials || !passwordOk) {
    throw new HttpError(401, "Credenciales inválidas", {
      details: [{ field: "password", message: "Correo o contraseña incorrectos" }],
    });
  }

  const { token, expiresAt } = createSessionToken(credentials.email);
  return { token, role: ROLES.ADMIN, email: credentials.email, expiresAt };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  isActiveAdmin,
  login,
};
