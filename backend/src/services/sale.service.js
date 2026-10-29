const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { STORE_NAME, PAYMENT_METHODS } = require("../config/constants");
const { HttpError, validationError, notFound } = require("../utils/httpError");
const { isValidId, isPositiveInteger, round2 } = require("../utils/validation");
const { calculateDiscount } = require("./discount.service");

function validateSaleBody(body = {}) {
  const details = [];
  const { items, paymentMethod } = body;

  if (!Array.isArray(items) || items.length === 0) {
    details.push({ field: "items", message: "Agrega al menos un producto a la cuenta." });
  } else {
    items.forEach((item, i) => {
      if (typeof item?.productId !== "string" || item.productId.trim() === "") {
        details.push({ field: `items[${i}].productId`, message: "Falta indicar uno de los productos." });
      }
      if (!isPositiveInteger(item?.quantity)) {
        details.push({
          field: `items[${i}].quantity`,
          message: "La cantidad de cada producto debe ser de 1 o más.",
        });
      }
    });
  }

  if (paymentMethod !== undefined && !PAYMENT_METHODS.includes(paymentMethod)) {
    details.push({
      field: "paymentMethod",
      message: "Elige un método de pago: efectivo, tarjeta o transferencia.",
    });
  }

  const { customerId } = body;
  if (customerId !== undefined && customerId !== null && typeof customerId !== "string") {
    details.push({ field: "customerId", message: "El cliente seleccionado no es válido." });
  }

  if (details.length > 0) throw validationError(details);
}

// Decisión del equipo: un customerId inexistente se rechaza (400) en vez de vender sin cliente
async function resolveCustomer(customerId, session) {
  if (customerId === undefined || customerId === null || customerId === "") return null;

  const customer = isValidId(customerId)
    ? await Customer.findById(customerId).session(session ?? null)
    : null;
  if (!customer) {
    throw new HttpError(400, "Cliente no encontrado", {
      details: [{ field: "customerId", message: "Ese cliente ya no está registrado. Quítalo de la cuenta o elige otro." }],
    });
  }
  return customer;
}

async function resolveItems(items, session) {
  const ids = items.map((item) => item.productId).filter(isValidId);
  const products = await Product.find({ _id: { $in: ids } }).session(session ?? null);
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const missing = items.flatMap((item, i) =>
    productMap.has(item.productId)
      ? []
      : [{ field: `items[${i}].productId`, productId: item.productId, message: "Un producto de la cuenta ya no está en el menú. Quítalo e intenta de nuevo." }]
  );
  if (missing.length > 0) {
    throw new HttpError(400, "Producto no encontrado", { details: missing });
  }

  const unavailable = [];
  const sizeErrors = [];
  const lines = items.map((item, i) => {
    const product = productMap.get(item.productId);
    if (!product.available) {
      unavailable.push({
        field: `items[${i}].productId`,
        productId: product.id,
        productName: product.name,
        message: `${product.name} no está disponible por ahora.`,
      });
    }

    let unitPrice = product.price;
    let size;
    if (product.category === "bebida") {
      const chosen = product.sizes.find((s) => s.name === item.size);
      if (!chosen) {
        sizeErrors.push({
          field: `items[${i}].size`,
          message: `Elige un tamaño para ${product.name}.`,
        });
      } else {
        unitPrice = chosen.price;
        size = chosen.name;
      }
    }

    return { index: i, product, size, unitPrice, quantity: item.quantity };
  });

  if (sizeErrors.length > 0) throw validationError(sizeErrors);
  if (unavailable.length > 0) {
    throw new HttpError(400, "Producto no disponible", { details: unavailable });
  }
  return lines;
}

// Dos tamaños de la misma bebida comparten stock
function quantityByProduct(lines) {
  const totals = new Map();
  for (const line of lines) {
    const key = String(line.product._id);
    const current = totals.get(key) ?? { index: line.index, product: line.product, quantity: 0 };
    current.quantity += line.quantity;
    totals.set(key, current);
  }
  return [...totals.values()];
}

function insufficientStockError(entries) {
  return new HttpError(400, "Stock insuficiente", {
    details: entries.map(({ index, product, quantity, available }) => ({
      field: `items[${index}].quantity`,
      productId: product.id,
      productName: product.name,
      available,
      requested: quantity,
      message:
        available > 0
          ? `Solo quedan ${available} de ${product.name} y la cuenta pide ${quantity}.`
          : `Ya no queda ${product.name}.`,
    })),
  });
}

// Venta todo-o-nada: el update condicional (stock >= cantidad) evita stock negativo con ventas
// simultáneas, y si un producto falla se regresa el stock de los ya descontados.
async function reserveStock(lines, session) {
  const totals = quantityByProduct(lines);

  const insufficient = totals
    .filter(({ product, quantity }) => product.stock < quantity)
    .map((entry) => ({ ...entry, available: entry.product.stock }));
  if (insufficient.length > 0) throw insufficientStockError(insufficient);

  const reserved = [];
  for (const entry of totals) {
    const result = await Product.updateOne(
      { _id: entry.product._id, stock: { $gte: entry.quantity } },
      { $inc: { stock: -entry.quantity } },
      { session }
    );
    if (result.modifiedCount === 0) {
      if (!session) await releaseStock(reserved);
      const fresh = await Product.findById(entry.product._id).session(session ?? null);
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
    id: saleId,
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

function buildSaleDocument(customer, lines, paymentMethod) {
  const items = lines.map((line) => ({
    productId: line.product._id,
    productNameSnapshot: line.product.name,
    ...(line.size && { size: line.size }),
    unitPriceSnapshot: line.unitPrice,
    quantity: line.quantity,
    lineTotal: round2(line.unitPrice * line.quantity),
  }));

  const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  // Se basa en las compras anteriores a esta venta y se aplica a toda la venta
  const discountPercent = customer ? calculateDiscount(customer.purchasesCount) : 0;
  const discountAmount = round2(subtotal * (discountPercent / 100));

  return {
    customerId: customer?._id ?? null,
    customerNameSnapshot: customer?.name ?? null,
    paymentMethod: paymentMethod ?? "cash",
    items,
    subtotal,
    discountPercent,
    discountAmount,
    total: round2(subtotal - discountAmount),
  };
}

async function registerSale(body, session) {
  const customer = await resolveCustomer(body.customerId, session);
  const lines = await resolveItems(body.items, session);
  const reserved = await reserveStock(lines, session);
  const doc = buildSaleDocument(customer, lines, body.paymentMethod);

  if (session) {
    const [sale] = await Sale.create([doc], { session });
    if (customer) {
      await Customer.updateOne({ _id: customer._id }, { $inc: { purchasesCount: 1 } }, { session });
    }
    return sale;
  }

  let sale;
  try {
    sale = await Sale.create(doc);
    if (customer) {
      await Customer.updateOne({ _id: customer._id }, { $inc: { purchasesCount: 1 } });
    }
  } catch (err) {
    if (sale) await Sale.deleteOne({ _id: sale._id });
    await releaseStock(reserved);
    throw err;
  }
  return sale;
}

let transactionsSupported;

async function supportsTransactions() {
  if (transactionsSupported === undefined) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  }
  return transactionsSupported;
}

// Regla del Kit: si falla la base de datos al guardar → 500 y no se guarda nada. Con réplica
// (Atlas) todo va en una transacción; un MongoDB standalone no las soporta y se deshace a mano.
async function createSale(body) {
  validateSaleBody(body);
  const sale = (await supportsTransactions())
    ? await mongoose.connection.transaction((session) => registerSale(body, session))
    : await registerSale(body);
  return toSaleResponse(sale);
}

async function getSale(id) {
  const sale = isValidId(id) ? await Sale.findById(id) : null;
  if (!sale) throw notFound("Venta no encontrada", id);
  return toSaleResponse(sale);
}

async function listSales({ customerId, skip, limit }) {
  const filter = {};
  if (customerId !== undefined) {
    if (!isValidId(customerId)) return { data: [], total: 0 };
    filter.customerId = customerId;
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Sale.countDocuments(filter),
  ]);
  return { data: sales.map(toSaleResponse), total };
}

module.exports = { createSale, getSale, listSales };
