const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { PRODUCT_CATEGORIES, DRINK_SIZES_COUNT } = require("../config/constants");
const { validationError, notFound } = require("../utils/httpError");
const { isValidId, escapeRegex } = require("../utils/validation");

const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function validateProductData(data) {
  const details = [];

  if (typeof data.name !== "string" || data.name.trim().length === 0) {
    details.push({ field: "name", message: "name es requerido" });
  } else if (data.name.trim().length > 100) {
    details.push({ field: "name", message: "name debe tener como máximo 100 caracteres" });
  }

  if (data.category !== undefined && !PRODUCT_CATEGORIES.includes(data.category)) {
    details.push({
      field: "category",
      message: `category debe ser una de: ${PRODUCT_CATEGORIES.join(", ")}`,
    });
  }

  if (data.category === "bebida") {
    if (!Array.isArray(data.sizes) || data.sizes.length !== DRINK_SIZES_COUNT) {
      details.push({ field: "sizes", message: "Las bebidas necesitan exactamente 3 tamaños" });
    } else {
      data.sizes.forEach((size, i) => {
        if (typeof size?.name !== "string" || size.name.trim().length === 0) {
          details.push({ field: `sizes[${i}].name`, message: "El tamaño necesita un nombre" });
        }
        if (!isPositiveNumber(size?.price)) {
          details.push({ field: `sizes[${i}].price`, message: "price debe ser un número mayor a 0" });
        }
      });
    }
  } else {
    if (data.price === undefined || data.price === null) {
      details.push({ field: "price", message: "price es requerido" });
    } else if (!isPositiveNumber(data.price)) {
      details.push({ field: "price", message: "price debe ser un número mayor a 0" });
    }
    if (Array.isArray(data.sizes) && data.sizes.length > 0) {
      details.push({ field: "sizes", message: "Solo las bebidas usan tamaños" });
    }
  }

  if (data.stock === undefined || data.stock === null) {
    details.push({ field: "stock", message: "stock es requerido" });
  } else if (!Number.isInteger(data.stock) || data.stock < 0) {
    details.push({ field: "stock", message: "stock debe ser un entero mayor o igual a 0" });
  }

  if (data.available !== undefined && typeof data.available !== "boolean") {
    details.push({ field: "available", message: "available debe ser true o false" });
  }

  if (data.description !== undefined && typeof data.description !== "string") {
    details.push({ field: "description", message: "description debe ser texto" });
  }

  return details;
}

// Lista blanca: evita que se cuelen _id, createdAt, etc.
function pickProductFields(body = {}) {
  const fields = ["name", "description", "category", "price", "sizes", "stock", "available"];
  const picked = {};
  for (const field of fields) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  if (typeof picked.name === "string") picked.name = picked.name.trim();
  return picked;
}

function normalizeByCategory(data) {
  if (data.category === "bebida") {
    data.price = undefined;
    data.sizes = data.sizes.map((s) => ({ name: s.name.trim(), price: s.price }));
  } else {
    data.sizes = [];
  }
  return data;
}

async function listProducts({ q, page, limit, skip }) {
  const filter = {};
  const search = typeof q === "string" ? q.trim() : "";
  if (search) filter.name = new RegExp(escapeRegex(search), "i");

  const [products, unitsSold] = await Promise.all([
    Product.find(filter),
    Sale.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", unitsSold: { $sum: "$items.quantity" } } },
    ]),
  ]);

  const unitsByProduct = new Map(unitsSold.map((s) => [String(s._id), s.unitsSold]));
  products.sort((a, b) => {
    const soldA = unitsByProduct.get(String(a._id)) ?? 0;
    const soldB = unitsByProduct.get(String(b._id)) ?? 0;
    if (soldB !== soldA) return soldB - soldA;
    return a.name.localeCompare(b.name, "es");
  });

  return {
    data: products.slice(skip, skip + limit),
    total: products.length,
    search,
  };
}

async function getProduct(id) {
  const product = isValidId(id) ? await Product.findById(id) : null;
  if (!product) throw notFound("Producto no encontrado", id);
  return product;
}

async function createProduct(body) {
  const data = { category: "otro", ...pickProductFields(body) };
  const details = validateProductData(data);
  if (details.length > 0) throw validationError(details);

  return Product.create(normalizeByCategory(data));
}

async function updateProduct(id, body) {
  const product = await getProduct(id);
  const changes = pickProductFields(body);
  const merged = {
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    sizes: product.sizes.map((s) => ({ name: s.name, price: s.price })),
    stock: product.stock,
    available: product.available,
    ...changes,
  };

  const details = validateProductData(merged);
  if (details.length > 0) throw validationError(details);

  product.set(normalizeByCategory(merged));
  await product.save();
  return product;
}

async function deleteProduct(id) {
  const product = await getProduct(id);
  await product.deleteOne();
  return product;
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
