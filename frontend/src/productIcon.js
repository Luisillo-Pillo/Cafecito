import { normalize } from "./utils";

// Reglas de palabras clave más específicas primero, para que un nombre como
// "Pastel de zanahoria" tome el ícono de zanahoria antes que el genérico de pastel,
// o "Chai Latte" el de té antes que el genérico de café.
const KEYWORD_ICONS = [
  { keywords: ["zanahoria"], icon: "🥕" },
  { keywords: ["pastel", "cake"], icon: "🍰" },
  { keywords: ["muffin"], icon: "🧁" },
  { keywords: ["brownie"], icon: "🍫" },
  { keywords: ["concha"], icon: "🍞" },
  { keywords: ["galleta"], icon: "🍪" },
  { keywords: ["bagel"], icon: "🥯" },
  { keywords: ["croissant"], icon: "🥐" },
  { keywords: ["chapata"], icon: "🥪" },
  { keywords: ["pan"], icon: "🥐" },
  { keywords: ["sandwich", "sándwich"], icon: "🥪" },
  { keywords: ["papas", "fritas"], icon: "🍟" },
  { keywords: ["agua"], icon: "💧" },
  { keywords: ["jugo", "naranja", "limonada"], icon: "🧃" },
  { keywords: ["chocolate caliente"], icon: "🍫" },
  {
    keywords: ["horchata", "cold brew", "frappe", "frappé", "smoothie", "helado"],
    icon: "🥤",
  },
  { keywords: ["matcha", "tisana", "te chai", "té chai", "chai", "infusion", "infusión"], icon: "🍵" },
  {
    keywords: [
      "capuchino",
      "cappuccino",
      "latte",
      "espresso",
      "macchiato",
      "mocha",
      "americano",
      "flat white",
      "cafe",
      "café",
    ],
    icon: "☕",
  },
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
