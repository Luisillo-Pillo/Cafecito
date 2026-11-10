export const API_PORT = 5100;
export const WEB_PORT = 5174;
export const API_URL = `http://127.0.0.1:${API_PORT}/api`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

export const DB_URI = process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27017/cafecito_e2e_test";
export const ADMIN_EMAIL = "admin@cafecito.e2e";
export const ADMIN_PASSWORD = "clave-e2e-segura";
export const ADMIN_TOKEN = "e2e-admin-token";
