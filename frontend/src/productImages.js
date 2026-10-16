import { slugify } from "./utils";

const modules = import.meta.glob("./assets/products/*.svg", {
  eager: true,
  import: "default",
});

const productImages = {};
for (const path in modules) {
  const slug = path.split("/").pop().replace(".svg", "");
  productImages[slug] = modules[path];
}

export function getProductImage(product) {
  return productImages[slugify(product.name)];
}
