/**
 * Migración única al modelo del MVP del Kit de Arranque.
 * Es idempotente: se puede correr varias veces sin duplicar nada.
 *
 *   npm run migrate --workspace=backend            (stock inicial 50)
 *   npm run migrate --workspace=backend -- 100     (stock inicial 100)
 *
 * Qué hace:
 * 1. Productos sin `stock` → les asigna el stock inicial indicado.
 * 2. Clientes con `email`/`phone` (modelo anterior) → `phoneOrEmail` = email,
 *    y elimina los campos viejos. Quita el índice único viejo `email_1`.
 * 3. Compras de la colección antigua `orders` → ventas en `sales`
 *    (sin descuento, pago en efectivo, conservando fecha original).
 *    La colección `orders` NO se borra, por seguridad.
 * 4. Recalcula `purchasesCount` de cada cliente contando sus ventas.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/db");
const Product = require("../src/models/Product");
const Customer = require("../src/models/Customer");
const Sale = require("../src/models/Sale");

const initialStock = Number(process.argv[2] ?? 50);

async function migrateProducts() {
  const { modifiedCount } = await Product.collection.updateMany(
    { stock: { $exists: false } },
    { $set: { stock: initialStock } }
  );
  console.log(`[productos] ${modifiedCount} productos recibieron stock = ${initialStock}`);
}

async function migrateCustomers() {
  const collection = Customer.collection;

  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === "email_1")) {
    await collection.dropIndex("email_1");
    console.log("[clientes] índice único viejo email_1 eliminado");
  }

  const legacy = await collection.find({ phoneOrEmail: { $exists: false } }).toArray();
  for (const doc of legacy) {
    const phoneOrEmail = (doc.email ?? doc.phone ?? "").trim().toLowerCase();
    await collection.updateOne(
      { _id: doc._id },
      { $set: { phoneOrEmail, purchasesCount: doc.purchasesCount ?? 0 }, $unset: { email: "", phone: "" } }
    );
  }
  console.log(`[clientes] ${legacy.length} clientes migrados a phoneOrEmail`);

  await Customer.syncIndexes();
}

async function migrateOrders() {
  const collections = await mongoose.connection.db.listCollections({ name: "orders" }).toArray();
  if (collections.length === 0) {
    console.log("[ventas] no existe la colección orders, nada que migrar");
    return;
  }

  const orders = await mongoose.connection.collection("orders").find().toArray();
  const customers = await Customer.find({}, { name: 1 });
  const nameById = new Map(customers.map((c) => [String(c._id), c.name]));

  let migrated = 0;
  for (const order of orders) {
    const exists = await Sale.exists({ legacyOrderId: order._id });
    if (exists) continue;

    const items = (order.items ?? []).map((item) => ({
      productId: item.product,
      productNameSnapshot: item.name,
      ...(item.size && { size: item.size }),
      unitPriceSnapshot: item.price,
      quantity: item.qty,
      lineTotal: Math.round(item.price * item.qty * 100) / 100,
    }));
    if (items.length === 0) continue;

    const sale = new Sale({
      customerId: order.customer ?? null,
      customerNameSnapshot: order.customer ? nameById.get(String(order.customer)) ?? null : null,
      paymentMethod: "cash",
      items,
      subtotal: order.total,
      discountPercent: 0,
      discountAmount: 0,
      total: order.total,
      legacyOrderId: order._id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? order.createdAt,
    });
    await sale.save({ timestamps: false });
    migrated += 1;
  }
  console.log(`[ventas] ${migrated} compras de orders copiadas a sales`);
}

async function recountPurchases() {
  const counts = await Sale.aggregate([
    { $match: { customerId: { $ne: null } } },
    { $group: { _id: "$customerId", count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));

  const customers = await Customer.find();
  for (const customer of customers) {
    const count = countById.get(String(customer._id)) ?? 0;
    if (customer.purchasesCount !== count) {
      await Customer.updateOne({ _id: customer._id }, { $set: { purchasesCount: count } });
    }
  }
  console.log(`[clientes] purchasesCount recalculado para ${customers.length} clientes`);
}

async function main() {
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new Error("El stock inicial debe ser un entero mayor o igual a 0");
  }
  await connectDB();
  await migrateProducts();
  await migrateCustomers();
  await migrateOrders();
  await recountPurchases();
  console.log("✅ Migración terminada");
}

main()
  .catch((err) => {
    console.error("❌ Error en la migración:", err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
