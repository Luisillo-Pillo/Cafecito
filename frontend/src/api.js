export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function apiFetch(path, options) {
  const res = await fetch(`${API_URL}${path}`, options);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}
