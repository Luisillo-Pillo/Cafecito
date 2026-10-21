/**
 * Descuento progresivo para clientes recurrentes (ver Kit: contexto-narrativo).
 * Regla de negocio de Cafecito Feliz para reducir churn con margen controlado:
 *   0%  cliente nuevo        (purchasesCount = 0)
 *   5%  "probando"           (1 a 3 compras)
 *   10% "cliente semanal"    (4 a 7 compras)
 *   15% "VIP", tope máximo   (8 o más compras)
 * Solo el backend calcula el descuento; el frontend solo lo muestra.
 */
function calculateDiscount(purchasesCount) {
  const count = Number(purchasesCount) || 0;
  if (count <= 0) return 0;
  if (count <= 3) return 5;
  if (count <= 7) return 10;
  return 15;
}

module.exports = { calculateDiscount };
