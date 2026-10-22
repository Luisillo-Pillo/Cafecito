export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const ROLE_KEY = "cafecito.role";

// Rol del usuario (vendedor | admin). Se envía en cada petición como X-User-Role.
let currentRole = readStoredRole();

function readStoredRole() {
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    return stored === "admin" || stored === "vendedor" ? stored : "vendedor";
  } catch {
    return "vendedor";
  }
}

export function getRole() {
  return currentRole;
}

export function setRole(role) {
  currentRole = role;
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Sin almacenamiento disponible: el rol solo dura mientras la pestaña esté abierta
  }
}

/**
 * Error de la API con el status y los `details` del backend, para que cada
 * pantalla pueda mostrar el mensaje concreto (ej. "Solo hay 3 disponibles").
 */
export class ApiError extends Error {
  constructor(status, body) {
    const details = Array.isArray(body?.details) ? body.details : [];
    const detailText = details.map((d) => d.message).filter(Boolean).join(". ");
    super(detailText || body?.message || body?.error || `HTTP ${status}`);
    this.status = status;
    this.title = body?.error;
    this.details = details;
  }
}

/**
 * fetch() hacia la API: agrega el rol y Content-Type, y convierte respuestas
 * no exitosas en ApiError. `body` puede ser un objeto (se serializa a JSON).
 */
export async function apiFetch(path, { body, headers, ...options } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "X-User-Role": currentRole,
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errorBody);
  }

  if (res.status === 204) return null;
  return res.json();
}
