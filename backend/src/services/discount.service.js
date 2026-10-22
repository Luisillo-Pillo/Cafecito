// Decisión de negocio del Kit: descuento progresivo por compras previas para premiar al cliente
// recurrente con margen controlado (0 → 0%, 1-3 → 5%, 4-7 → 10%, 8+ → 15% tope). Solo el backend
// lo calcula y se aplica a toda la venta; el frontend solo lo muestra.
function calculateDiscount(purchasesCount) {
  const count = Number(purchasesCount) || 0;
  if (count <= 0) return 0;
  if (count <= 3) return 5;
  if (count <= 7) return 10;
  return 15;
}

module.exports = { calculateDiscount };
