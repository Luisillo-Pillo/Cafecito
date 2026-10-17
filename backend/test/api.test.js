/**
 * Pruebas de integración de la API (Backend ↔ BD), basadas en el Contrato de API
 * y en los Edge Cases del Kit de Arranque.
 *
 * Necesitan una base de datos DESECHABLE en TEST_MONGODB_URI cuyo nombre termine
 * en "_test" (las pruebas borran productos, clientes y ventas de esa base).
 * Si la variable no está definida, estas pruebas se omiten.
 *
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/cafecito_test npm test
 */
require("dotenv/config");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const TEST_URI = process.env.TEST_MONGODB_URI;
// Nombre de la base = lo que va después de la última "/" y antes de "?"
const dbName = TEST_URI ? (TEST_URI.split("?")[0].split("/")[3] ?? "") : "";
const skip = !TEST_URI
  ? "TEST_MONGODB_URI no está definida"
  : !/_test$/.test(dbName)
    ? `La base "${dbName}" no termina en _test; por seguridad no se usa`
    : false;

process.env.NODE_ENV = "test";

describe("API de Cafecito (integración)", { skip }, () => {
  let server;
  let baseUrl;
  const ids = {};

  async function api(method, path, { body, role, token } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (role) headers["X-User-Role"] = role;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  before(async () => {
    const { connectDB } = require("../src/config/db");
    const { createApp } = require("../src/app");
    const Product = require("../src/models/Product");
    const Customer = require("../src/models/Customer");
    const Sale = require("../src/models/Sale");

    await connectDB(TEST_URI);
    await Promise.all([Product.deleteMany({}), Customer.deleteMany({}), Sale.deleteMany({})]);
    await Customer.syncIndexes();

    const [americano, concha] = await Product.create([
      {
        name: "Americano",
        category: "bebida",
        sizes: [
          { name: "Chico", price: 35 },
          { name: "Mediano", price: 42 },
          { name: "Grande", price: 48 },
        ],
        stock: 50,
      },
      { name: "Concha", category: "postre", price: 22, stock: 10 },
    ]);
    const [ana, juan] = await Customer.create([
      { name: "Ana Torres", phoneOrEmail: "ana@example.com", purchasesCount: 2 },
      { name: "Juan García", phoneOrEmail: "juan@example.com", purchasesCount: 7 },
    ]);
    Object.assign(ids, {
      americano: americano.id,
      concha: concha.id,
      ana: ana.id,
      juan: juan.id,
    });

    server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await mongoose.disconnect();
  });

  describe("Autenticación y permisos", () => {
    it("sin credenciales → 401", async () => {
      const res = await api("GET", "/customers");
      assert.equal(res.status, 401);
    });

    it("token Bearer inválido → 401", async () => {
      const res = await api("GET", "/customers", { token: "invalid_token_abc123" });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Token inválido");
    });

    it("token Bearer de vendedor puede ver clientes → 200", async () => {
      const res = await api("GET", "/customers", { token: "dev-vendedor-token" });
      assert.equal(res.status, 200);
    });

    it("vendedor intenta crear producto → 403", async () => {
      const res = await api("POST", "/products", {
        role: "vendedor",
        body: { name: "Café", price: 5, stock: 100 },
      });
      assert.equal(res.status, 403);
    });

    it("ver productos es público → 200", async () => {
      const res = await api("GET", "/products");
      assert.equal(res.status, 200);
    });
  });

  describe("Productos", () => {
    it("lista paginada { data, total, page, limit } con id y stock", async () => {
      const res = await api("GET", "/products");
      assert.equal(res.body.total, 2);
      assert.equal(res.body.page, 1);
      assert.equal(res.body.limit, 20);
      assert.ok(res.body.data[0].id);
      assert.equal(res.body.data[0]._id, undefined);
      assert.equal(typeof res.body.data[0].stock, "number");
    });

    it("búsqueda vacía devuelve todos; sin resultados → 200 con data vacía", async () => {
      assert.equal((await api("GET", "/products?q=")).body.total, 2);
      const none = await api("GET", "/products?q=xyzabc123");
      assert.equal(none.status, 200);
      assert.deepEqual(none.body.data, []);
    });

    it("paginación inválida → 400 con detalle por parámetro", async () => {
      const res = await api("GET", "/products?page=-1&limit=abc");
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.details.map((d) => d.field).sort(), ["limit", "page"]);
    });

    it("crear con body del contrato → 201", async () => {
      const res = await api("POST", "/products", {
        role: "admin",
        body: { name: "Galleta artesanal", price: 2.5, stock: 40 },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.stock, 40);
      ids.galleta = res.body.id;
    });

    it("sin nombre, precio negativo y stock decimal → 422", async () => {
      const res = await api("POST", "/products", {
        role: "admin",
        body: { price: -5, stock: 1.5 },
      });
      assert.equal(res.status, 422);
      assert.deepEqual(res.body.details.map((d) => d.field).sort(), ["name", "price", "stock"]);
    });

    it("actualizar → 200; producto inexistente → 404", async () => {
      const ok = await api("PUT", `/products/${ids.galleta}`, {
        role: "admin",
        body: { price: 3, stock: 41 },
      });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.price, 3);
      const missing = await api("PUT", "/products/000000000000000000000000", {
        role: "admin",
        body: { price: 3 },
      });
      assert.equal(missing.status, 404);
    });
  });

  describe("Clientes", () => {
    it("registrar con teléfono → 201 y purchasesCount 0 aunque se envíe otro valor", async () => {
      const res = await api("POST", "/customers", {
        role: "vendedor",
        body: { name: "María González", phoneOrEmail: "+52 449 765 4321", purchasesCount: 99 },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.phoneOrEmail, "+524497654321");
      assert.equal(res.body.purchasesCount, 0);
      ids.maria = res.body.id;
    });

    it("nombre de 1 carácter y contacto inválido → 422", async () => {
      const res = await api("POST", "/customers", {
        role: "vendedor",
        body: { name: "X", phoneOrEmail: "noesunEmailValido" },
      });
      assert.equal(res.status, 422);
      assert.equal(res.body.details.length, 2);
    });

    it("correo duplicado (sin importar mayúsculas) → 400 con existingCustomerId", async () => {
      const res = await api("POST", "/customers", {
        role: "vendedor",
        body: { name: "Otra Ana", phoneOrEmail: "ANA@example.com" },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.details[0].existingCustomerId, ids.ana);
    });

    it("buscar por q → coincidencias", async () => {
      const res = await api("GET", "/customers?q=juan", { role: "vendedor" });
      assert.equal(res.body.total, 1);
      assert.equal(res.body.data[0].nextDiscountPercent, 10);
    });
  });

  describe("Ventas", () => {
    it("items vacío → 422", async () => {
      const res = await api("POST", "/sales", { role: "vendedor", body: { items: [] } });
      assert.equal(res.status, 422);
    });

    it("cantidad 0 y método de pago inválido → 422", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: { paymentMethod: "bitcoin", items: [{ productId: ids.concha, quantity: 0 }] },
      });
      assert.equal(res.status, 422);
      assert.equal(res.body.details.length, 2);
    });

    it("producto inexistente → 400", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: { items: [{ productId: "prod-9999", quantity: 1 }] },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Producto no encontrado");
    });

    it("cliente inexistente → 400", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: {
          customerId: "000000000000000000000000",
          items: [{ productId: ids.concha, quantity: 1 }],
        },
      });
      assert.equal(res.status, 400);
    });

    it("stock insuficiente → 400, toda la venta se rechaza y el stock no cambia", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: {
          items: [
            { productId: ids.americano, quantity: 1, size: "Chico" },
            { productId: ids.concha, quantity: 11 },
          ],
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.details[0].available, 10);
      assert.equal(res.body.details[0].requested, 11);
      const americano = await api("GET", `/products/${ids.americano}`);
      assert.equal(americano.body.stock, 50);
    });

    it("venta sin cliente → 201, sin descuento y sin tocar purchasesCount", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: { customerId: null, items: [{ productId: ids.concha, quantity: 2 }] },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.discountPercent, 0);
      assert.equal(res.body.total, 44);
      assert.equal(res.body.ticket.customerName, "Público general");
    });

    it("cliente con 2 compras → 5%; actualiza stock y purchasesCount; incluye ticket", async () => {
      const res = await api("POST", "/sales", {
        role: "vendedor",
        body: {
          customerId: ids.ana,
          paymentMethod: "card",
          items: [
            { productId: ids.americano, quantity: 2, size: "Mediano" },
            { productId: ids.concha, quantity: 1 },
          ],
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.subtotal, 106);
      assert.equal(res.body.discountPercent, 5);
      assert.equal(res.body.discountAmount, 5.3);
      assert.equal(res.body.total, 100.7);
      assert.equal(res.body.ticket.storeName, "Cafecito Feliz");
      assert.equal(res.body.ticket.discount, "5% (-$5.30)");
      ids.sale = res.body.saleId;

      assert.equal((await api("GET", `/products/${ids.americano}`)).body.stock, 48);
      assert.equal((await api("GET", `/products/${ids.concha}`)).body.stock, 7);
      const ana = await api("GET", `/customers/${ids.ana}`, { role: "vendedor" });
      assert.equal(ana.body.purchasesCount, 3);
    });

    it("cliente con 7 compras → 10%; con 8 → 15%", async () => {
      const body = { customerId: ids.juan, items: [{ productId: ids.concha, quantity: 1 }] };
      const first = await api("POST", "/sales", { role: "vendedor", body });
      assert.equal(first.body.discountPercent, 10);
      const second = await api("POST", "/sales", { role: "vendedor", body });
      assert.equal(second.body.discountPercent, 15);
    });

    it("GET /sales/:id devuelve la venta con ticket; inexistente → 404", async () => {
      const ok = await api("GET", `/sales/${ids.sale}`, { role: "vendedor" });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.saleId, ids.sale);
      const missing = await api("GET", "/sales/000000000000000000000000", { role: "vendedor" });
      assert.equal(missing.status, 404);
    });

    it("historial del cliente, más reciente primero", async () => {
      const res = await api("GET", `/customers/${ids.ana}/sales`, { role: "vendedor" });
      assert.equal(res.body.total, 1);
      assert.equal(res.body.data[0].saleId, ids.sale);
    });

    it("dos ventas simultáneas no dejan el stock negativo", async () => {
      // Quedan 5 conchas: dos ventas de 3 a la vez → solo una puede pasar
      const body = { items: [{ productId: ids.concha, quantity: 3 }] };
      const results = await Promise.all([
        api("POST", "/sales", { role: "vendedor", body }),
        api("POST", "/sales", { role: "vendedor", body }),
      ]);
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [201, 400]);
      assert.equal((await api("GET", `/products/${ids.concha}`)).body.stock, 2);
    });
  });

  describe("Errores generales", () => {
    it("JSON mal formado → 400", async () => {
      const res = await fetch(`${baseUrl}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "vendedor" },
        body: "{malo",
      });
      assert.equal(res.status, 400);
    });

    it("ruta inexistente → 404", async () => {
      assert.equal((await api("GET", "/nada")).status, 404);
    });

    it("eliminar producto (admin) → 200; otra vez → 404", async () => {
      const ok = await api("DELETE", `/products/${ids.galleta}`, { token: "dev-admin-token" });
      assert.equal(ok.status, 200);
      const again = await api("DELETE", `/products/${ids.galleta}`, { token: "dev-admin-token" });
      assert.equal(again.status, 404);
    });
  });
});
