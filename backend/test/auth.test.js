const test = require("node:test");
const assert = require("node:assert/strict");

process.env.AUTH_SECRET = "secreto-de-pruebas-unitarias";
const {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} = require("../src/services/auth.service");

test("el hash no contiene la contraseña y solo verifica con la correcta", async () => {
  const hash = await hashPassword("mi-clave-segura");
  assert.ok(!hash.includes("mi-clave-segura"));
  assert.equal(await verifyPassword("mi-clave-segura", hash), true);
  assert.equal(await verifyPassword("otra-clave", hash), false);
});

test("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
  assert.notEqual(await hashPassword("clave"), await hashPassword("clave"));
});

test("un hash con formato desconocido nunca verifica", async () => {
  assert.equal(await verifyPassword("clave", "texto-plano"), false);
});

test("el token de sesión es válido y lleva rol admin; alterado deja de serlo", () => {
  const { token } = createSessionToken("admin@cafecito.test");
  assert.equal(verifySessionToken(token).role, "admin");
  assert.equal(verifySessionToken(`${token}x`), null);
  assert.equal(verifySessionToken("no-es-un-token"), null);
});
