export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export const dateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
];

/**
 * VISTA PREVIA del descuento por compras previas (misma regla que
 * backend/src/services/discount.service.js). El backend es quien calcula el
 * descuento real al cobrar; esto solo sirve para mostrarlo antes de cobrar.
 */
export function previewDiscount(purchasesCount) {
  const count = Number(purchasesCount) || 0;
  if (count <= 0) return 0;
  if (count <= 3) return 5;
  if (count <= 7) return 10;
  return 15;
}

export function discountLabel(percent) {
  if (percent === 0) return "Cliente nuevo · sin descuento";
  if (percent === 5) return "Cliente recurrente · 5%";
  if (percent === 10) return "Cliente semanal · 10%";
  return "Cliente VIP · 15%";
}
