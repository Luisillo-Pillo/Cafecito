const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const SESSION_KEY = "cafecito.session";

let session = readStoredSession();
const roleListeners = new Set();

function isActive(candidate) {
  return Boolean(candidate?.token) && Date.parse(candidate.expiresAt) > Date.now();
}

function readStoredSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
    return isActive(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
  roleListeners.forEach((listener) => listener(getRole()));
}

export function getRole() {
  return session ? "admin" : "vendedor";
}

export function getSessionEmail() {
  return session?.email ?? null;
}

export function onRoleChange(listener) {
  roleListeners.add(listener);
  return () => roleListeners.delete(listener);
}

export async function loginAdmin(email, password) {
  const result = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
  saveSession({ token: result.token, email: result.email, expiresAt: result.expiresAt });
}

export function logout() {
  saveSession(null);
}

const MESSAGES = {
  offline: "No pudimos conectarnos con el sistema. Revisa tu conexión a internet e intenta de nuevo.",
  session: "Tu sesión de administrador terminó. Vuelve a elegir Administrador para ingresar de nuevo.",
  forbidden: "No tienes permiso para hacer esto. Pide ayuda a un administrador.",
  notFound: "No encontramos ese registro; es posible que alguien lo haya eliminado. Actualiza la página.",
  server: "Algo salió mal de nuestro lado y no se guardó ningún cambio. Intenta de nuevo en un momento.",
};

class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function toApiError(status, body, hadSession) {
  const details = Array.isArray(body?.details) ? body.details : [];
  if (status === 401 && hadSession) return new ApiError(status, MESSAGES.session, details);
  if (status === 403) return new ApiError(status, MESSAGES.forbidden, details);
  if (status === 404) return new ApiError(status, MESSAGES.notFound, details);
  if (status >= 500) return new ApiError(status, MESSAGES.server, details);
  const text = details.map((d) => d.message).filter(Boolean).join(" ");
  return new ApiError(status, text || MESSAGES.server, details);
}

export async function apiFetch(path, { body, headers, ...options } = {}) {
  if (session && !isActive(session)) logout();

  const hadSession = Boolean(session);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(session ? { Authorization: `Bearer ${session.token}` } : { "X-User-Role": "vendedor" }),
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, MESSAGES.offline);
  }

  if (!res.ok) {
    if (res.status === 401 && hadSession) logout();
    const errorBody = await res.json().catch(() => null);
    throw toApiError(res.status, errorBody, hadSession);
  }

  if (res.status === 204) return null;
  return res.json();
}
