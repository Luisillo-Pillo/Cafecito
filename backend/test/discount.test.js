// Pruebas unitarias de la regla de descuento (npm test --workspace=backend)
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateDiscount } = require("../src/services/discount.service");

test("cliente nuevo (0 compras) no tiene descuento", () => {
  assert.equal(calculateDiscount(0), 0);
});

test("1 a 3 compras → 5%", () => {
  assert.equal(calculateDiscount(1), 5);
  assert.equal(calculateDiscount(3), 5);
});

test("4 a 7 compras → 10%", () => {
  assert.equal(calculateDiscount(4), 10);
  assert.equal(calculateDiscount(7), 10);
});

test("8 o más compras → 15% (tope)", () => {
  assert.equal(calculateDiscount(8), 15);
  assert.equal(calculateDiscount(50), 15);
});

test("valores raros se tratan como cliente nuevo", () => {
  assert.equal(calculateDiscount(undefined), 0);
  assert.equal(calculateDiscount(-2), 0);
});
