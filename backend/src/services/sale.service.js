const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { STORE_NAME, PAYMENT_METHODS } = require("../config/constants");
const { HttpError, validationError, notFound } = require("../utils/httpError");
const { isValidId, isPositiveInteger, round2 } = require("../utils/validation");
const { calculateDiscount } = require("./discount.service");

/** Paso 1: forma del body (422 si algo no tiene el formato esperado). */
function validateSaleBody(body = {}) {
  const details = [];
  const { items, paymentMethod } = body;

  if (!Array.isArray(items) || items.length === 0) {
    details.push({ field: "items", message: "items no puede estar vacío (mínimo 1 producto)" });
  } else {
    items.forEach((item, i) => {
      if (typeof item?.productId !== "string" || item.productId.trim() === "") {
        details.push({ field: `items[${i}].productId`, message: "productId es requerido" });
      }
      if (!isPositiveInteger(item?.quantity)) {
        details.push({
          field: `items[${i}].quantity`,
          message: "quantity debe ser un entero mayor o igual a 1",
        });
      }
    });
  }

  if (paymentMethod !== undefined && !PAYMENT_METHODS.includes(paymentMethod)) {
    details.push({
      field: "paymentMethod",
      message: `paymentMethod debe ser uno de: ${PAYMENT_METHODS.join(", ")}`,
    });
  }

  const { customerId } = body;
  if (customerId !== undefined && customerId !== null && typeof customerId !== "string") {
    details.push({ field: "customerId", message: "customerId debe ser texto o null" });
  }

  if (details.length > 0) throw validationError(details);
}

/** Paso 2: cliente opcional. Si se envía y no existe se rechaza (integridad de datos). */
async function resolveCustomer(customerId) {
  if (customerId === undefined || customerId === null || customerId === "") return null;

  const customer = isValidId(customerId) ? await Customer.findById(customerId) : null;
  if (!customer) {
    throw new HttpError(400, "Cliente no encontrado", {
      details: [{ customerId, message: "El cliente no existe" }],
    });
  }
  return customer;
}

/** Paso 3: cada producto existe, está disponible y (si es bebida) trae un tamaño válido. */
async function resolveItems(items) {
  const ids = items.map((item) => item.productId).filter(isValidId);
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const missing = items
    .filter((item) => !productMap.has(item.productId))
    .map((item) => ({ productId: item.productId, message: "El producto no existe" }));
  if (missing.length > 0) {
    throw new HttpError(400, "Producto no encontrado", { details: missing });
  }

  const unavailable = [];
  const sizeErrors = [];
  const lines = items.map((item, i) => {
    const product = productMap.get(item.productId);
    if (!product.available) {
      unavailable.push({
        productId: product.id,
        productName: product.name,
        message: `${product.name} no está disponible por ahora`,
      });
    }

    let unitPrice = product.price;
    let size;
    if (product.category === "bebida") {
      const chosen = product.sizes.find((s) => s.name === item.size);
      if (!chosen) {
        sizeErrors.push({
          field: `items[${i}].size`,
          message: `Selecciona un tamaño válido para ${product.name}: ${product.sizes
            .map((s) => s.name)
            .join(", ")}`,
        });
      } else {
        unitPrice = chosen.price;
        size = chosen.name;
      }
    }

    return { product, size, unitPrice, quantity: item.quantity };
  });

  if (sizeErrors.length > 0) throw validationError(sizeErrors);
  if (unavailable.length > 0) {
    throw new HttpError(400, "Producto no disponible", { details: unavailable });
  }
  return lines;
}

// Suma cantidades por producto: dos tamaños de la misma bebida comparten stock
function quantityByProduct(lines) {
  const totals = new Map();
  for (const line of lines) {
    const key = String(line.product._id);
    const current = totals.get(key) ?? { product: line.product, quantity: 0 };
    current.quantity += line.quantity;
    totals.set(key, current);
  }
  return [...totals.values()];
}

function insufficientStockError(entries) {
  return new HttpError(400, "Stock insuficiente", {
    details: entries.map(({ product, quantity, available }) => ({
      productId: product.id,
      productName: product.name,
      available,
      requested: quantity,
      message: `Solo hay ${available} disponibles, se pidieron ${quantity}`,
    })),
  });
}

/**
 * Paso 4: valida y descuenta stock. Si algún producto no alcanza se rechaza
 * TODA la venta (no hay ventas parciales).
 *
 * El descuento es atómico por producto (`stock >= cantidad` en el mismo update),
 * así dos ventas simultáneas no pueden dejar el stock negativo. Si un producto
 * falla a mitad del proceso, se regresa el stock de los que ya se descontaron.
 */
async function reserveStock(lines) {
  const totals = quantityByProduct(lines);

  const insufficient = totals
    .filter(({ product, quantity }) => product.stock < quantity)
    .map((entry) => ({ ...entry, available: entry.product.stock }));
  if (insufficient.length > 0) throw insufficientStockError(insufficient);

  const reserved = [];
  for (const entry of totals) {
    const result = await Product.updateOne(
      { _id: entry.product._id, stock: { $gte: entry.quantity } },
      { $inc: { stock: -entry.quantity } }
    );
    if (result.modifiedCount === 0) {
      await releaseStock(reserved);
      const fresh = await Product.findById(entry.product._id);
      throw insufficientStockError([{ ...entry, available: fresh?.stock ?? 0 }]);
    }
    reserved.push(entry);
  }
  return reserved;
}

async function releaseStock(reserved) {
  await Promise.all(
    reserved.map(({ product, quantity }) =>
      Product.updateOne({ _id: product._id }, { $inc: { stock: quantity } })
    )
  );
}

const PAYMENT_LABELS = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

/** Convierte una venta guardada en la respuesta del contrato (incluye el ticket). */
function toSaleResponse(sale) {
  const saleId = String(sale._id);
  const items = sale.items.map((item) => ({
    productId: String(item.productId),
    productName: item.productNameSnapshot,
    ...(item.size && { size: item.size }),
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: item.lineTotal,
  }));

  return {
    saleId,
    customerId: sale.customerId ? String(sale.customerId) : null,
    customerName: sale.customerNameSnapshot ?? null,
    paymentMethod: sale.paymentMethod,
    items,
    subtotal: sale.subtotal,
    discountPercent: sale.discountPercent,
    discountAmount: sale.discountAmount,
    total: sale.total,
    ticket: {
      saleId,
      timestamp: sale.createdAt,
      storeName: STORE_NAME,
      customerName: sale.customerNameSnapshot ?? "Público general",
      items: items.map((item) => ({
        name: item.size ? `${item.productName} (${item.size})` : item.productName,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: sale.subtotal,
      discount:
        sale.discountPercent > 0
          ? `${sale.discountPercent}% (-$${sale.discountAmount.toFixed(2)})`
          : "Sin descuento",
      total: sale.total,
      paymentMethod: PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod,
    },
    createdAt: sale.createdAt,
  };
}

/**
 * Registra una venta (POST /api/sales). Orden del flujo del Kit:
 * validar body → cliente → productos → stock → calcular → guardar →
 * incrementar purchasesCount del cliente.
 */
async function createSale(body) {
  validateSaleBody(body);
  const customer = await resolveCustomer(body.customerId);
  const lines = await resolveItems(body.items);
  const reserved = await reserveStock(lines);

  const items = lines.map((line) => ({
    productId: line.product._id,
    productNameSnapshot: line.product.name,
    ...(line.size && { size: line.size }),
    unitPriceSnapshot: line.unitPrice,
    quantity: line.quantity,
    lineTotal: round2(line.unitPrice * line.quantity),
  }));

  const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  // El descuento se basa en las compras ANTERIORES a esta venta
  const discountPercent = customer ? calculateDiscount(customer.purchasesCount) : 0;
  const discountAmount = round2(subtotal * (discountPercent / 100));
  const total = round2(subtotal - discountAmount);

  let sale;
  try {
    sale = await Sale.create({
      customerId: customer?._id ?? null,
      customerNameSnapshot: customer?.name ?? null,
      paymentMethod: body.paymentMethod ?? "cash",
      items,
      subtotal,
      discountPercent,
      discountAmount,
      total,
    });
  } catch (err) {
    // Si la venta no se pudo guardar (ej. se cayó la BD), se regresa el stock
    await releaseStock(reserved);
    throw err;
  }

  // Una venta sin cliente NO incrementa el contador de nadie
  if (customer) {
    await Customer.updateOne({ _id: customer._id }, { $inc: { purchasesCount: 1 } });
  }

  return toSaleResponse(sale);
}

async function getSale(id) {
  const sale = isValidId(id) ? await Sale.findById(id) : null;
  if (!sale) throw notFound("Venta no encontrada", id);
  return toSaleResponse(sale);
}

async function listSales({ customerId, skip, limit }) {
  const filter = {};
  if (customerId !== undefined) filter.customerId = isValidId(customerId) ? customerId : null;

  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Sale.countDocuments(filter),
  ]);
  return { data: sales.map(toSaleResponse), total };
}

module.exports = { createSale, getSale, listSales, toSaleResponse };
