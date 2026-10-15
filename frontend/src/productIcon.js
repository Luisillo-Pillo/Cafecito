import { normalize } from "./utils";

// Reglas de palabras clave más específicas primero, para que un nombre como
// "Pastel de chocolate" tome el ícono de postre antes que el de chocolate caliente.
const KEYWORD_ICONS = [
  { keywords: ["pastel", "cake"], icon: "🍰" },
  { keywords: ["galleta"], icon: "🍪" },
  { keywords: ["croissant"], icon: "🥐" },
  { keywords: ["pan"], icon: "🥐" },
  { keywords: ["sandwich", "sándwich"], icon: "🥪" },
  { keywords: ["papas", "fritas"], icon: "🍟" },
  { keywords: ["agua"], icon: "💧" },
  { keywords: ["jugo", "naranja", "limonada"], icon: "🧃" },
  { keywords: ["chocolate caliente"], icon: "🍫" },
  { keywords: ["frappe", "frappé", "smoothie", "helado"], icon: "🥤" },
  { keywords: ["te chai", "té chai", "chai", "infusion", "infusión"], icon: "🍵" },
  { keywords: ["capuchino", "cappuccino", "latte", "espresso", "americano", "cafe", "café"], icon: "☕" },
];

const CATEGORY_ICONS = {
  bebida: "☕",
  postre: "🍰",
  snack: "🥪",
  otro: "🧾",
};

export function getProductIcon(product) {
  const name = normalize(product.name);
  const match = KEYWORD_ICONS.find(({ keywords }) =>
    keywords.some((keyword) => name.includes(normalize(keyword)))
  );
  if (match) return match.icon;
  return CATEGORY_ICONS[product.category] ?? "🧾";
}
