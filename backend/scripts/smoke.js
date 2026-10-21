/**
 * Smoke test: verifica que un backend YA LEVANTADO responde lo básico.
 * Lo usa el pipeline de CI (.github/workflows/ci.yml) después del build.
 * (Se llama smoke.js y no smoke-test.js para que `node --test` no lo tome como prueba.)
 *
 *   API_URL=http://localhost:5000/api npm run smoke --workspace=backend
 *
 * OJO: crea un producto, un cliente y una venta de prueba (y borra el producto
 * y el cliente al final). Úsalo contra una base de pruebas, no contra producción.
 */
const API_URL = process.env.API_URL ?? "http://localhost:5000/api";
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN || "dev-admin-token"}` };
const VENDEDOR = { Authorization: `Bearer ${process.env.VENDEDOR_TOKEN || "dev-vendedor-token"}` };

async function call(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...(body && { "Content-Type": "application/json" }), ...headers },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function step(name, expected, fn) {
  const { status, data } = await fn();
  if (status !== expected) {
    console.error(`❌ ${name}: esperaba ${expected}, recibió ${status}`, data);
    process.exit(1);
  }
  console.log(`✅ ${name} → ${status}`);
  return data;
}

async function waitForHealth(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const { status, data } = await call("GET", "/health");
      if (status === 200 && data.db === "connected") return;
    } catch {
      // el servidor todavía no acepta conexiones
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.error(`❌ La API no respondió en ${API_URL}/health`);
  process.exit(1);
}

async function main() {
  await waitForHealth();
  const unique = Date.now();

  await step("GET /health", 200, () => call("GET", "/health"));
  await step("GET /products", 200, () => call("GET", "/products"));

  const product = await step("POST /products (admin)", 201, () =>
    call("POST", "/products", {
      headers: ADMIN,
      body: { name: `Producto smoke ${unique}`, price: 10, stock: 5 },
    })
  );

  const customer = await step("POST /customers", 201, () =>
    call("POST", "/customers", {
      headers: VENDEDOR,
      body: { name: "Cliente smoke", phoneOrEmail: `smoke-${unique}@example.com` },
    })
  );

  const sale = await step("POST /sales", 201, () =>
    call("POST", "/sales", {
      headers: VENDEDOR,
      body: { customerId: customer.id, items: [{ productId: product.id, quantity: 2 }] },
    })
  );
  await step("GET /sales/:id", 200, () => call("GET", `/sales/${sale.saleId}`, { headers: VENDEDOR }));

  await step("POST /products sin token", 401, () =>
    call("POST", "/products", { body: { name: "X", price: 1, stock: 1 } })
  );
  await step("POST /sales con stock insuficiente", 400, () =>
    call("POST", "/sales", {
      headers: VENDEDOR,
      body: { items: [{ productId: product.id, quantity: 999 }] },
    })
  );

  await step("DELETE /products/:id (limpieza)", 200, () =>
    call("DELETE", `/products/${product.id}`, { headers: ADMIN })
  );
  await step("DELETE /customers/:id (limpieza)", 200, () =>
    call("DELETE", `/customers/${customer.id}`, { headers: ADMIN })
  );

  console.log("✅ Smoke test completo");
}

main().catch((err) => {
  console.error("❌ Error en el smoke test:", err);
  process.exit(1);
});
