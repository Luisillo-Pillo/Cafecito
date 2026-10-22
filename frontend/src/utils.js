export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export function discountLabel(percent) {
  if (percent === 0) return "Cliente nuevo · sin descuento";
  if (percent === 5) return "Cliente recurrente · 5%";
  if (percent === 10) return "Cliente semanal · 10%";
  return "Cliente VIP · 15%";
}
