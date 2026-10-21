/**
 * Datos de prueba para desarrollo (npm run seed --workspace=backend).
 *
 * NO borra nada: solo inserta productos si la colección de productos está vacía,
 * y solo inserta clientes si la de clientes está vacía. Así no pisa el catálogo
 * real que ya está cargado en Atlas. Si la base estaba completamente vacía,
 * además registra 3 ventas de ejemplo (con y sin cliente) usando el mismo
 * servicio que POST /api/sales, para que stock y purchasesCount queden coherentes.
 */
require("dotenv/config");
const { connectDB, disconnectDB } = require("../src/config/db");
const Product = require("../src/models/Product");
const Customer = require("../src/models/Customer");
const Sale = require("../src/models/Sale");
const { createSale } = require("../src/services/sale.service");

const sizes = (chico, mediano, grande) => [
  { name: "Chico", price: chico },
  { name: "Mediano", price: mediano },
  { name: "Grande", price: grande },
];

const SAMPLE_PRODUCTS = [
  { name: "Americano", category: "bebida", sizes: sizes(35, 42, 48), stock: 50 },
  { name: "Latte", category: "bebida", sizes: sizes(45, 52, 58), stock: 50 },
  { name: "Cappuccino", category: "bebida", sizes: sizes(45, 52, 58), stock: 50 },
  { name: "Café de olla", category: "bebida", sizes: sizes(32, 38, 44), stock: 40 },
  { name: "Frappé moka", category: "bebida", sizes: sizes(55, 62, 70), stock: 30 },
  { name: "Concha", category: "postre", price: 22, stock: 25 },
  { name: "Brownie", category: "postre", price: 38, stock: 20 },
  { name: "Croissant de jamón y queso", category: "snack", price: 65, stock: 15 },
];

// Los purchasesCount de ejemplo cubren los 4 niveles de descuento (0%, 5%, 10%, 15%)
const SAMPLE_CUSTOMERS = [
  { name: "Ana Torres", phoneOrEmail: "ana.torres@example.com", purchasesCount: 0 },
  { name: "Carlos Méndez", phoneOrEmail: "+524491234567", purchasesCount: 2 },
  { name: "Laura Jiménez", phoneOrEmail: "laura.jimenez@example.com", purchasesCount: 5 },
  { name: "Jorge Ramírez", phoneOrEmail: "+524497654321", purchasesCount: 9 },
  { name: "Sofía Vargas", phoneOrEmail: "sofia.vargas@example.com", purchasesCount: 1 },
];

async function seedSales() {
  const byName = async (Model, name) => (await Model.findOne({ name })).id;
  const americano = await byName(Product, "Americano");
  const concha = await byName(Product, "Concha");
  const latte = await byName(Product, "Latte");

  const sales = [
    // Cliente con 2 compras previas → 5%
    {
      customerId: await byName(Customer, "Carlos Méndez"),
      paymentMethod: "cash",
      items: [
        { productId: americano, quantity: 2, size: "Mediano" },
        { productId: concha, quantity: 1 },
      ],
    },
    // Cliente VIP (9 compras) → 15%
    {
      customerId: await byName(Customer, "Jorge Ramírez"),
      paymentMethod: "card",
      items: [{ productId: latte, quantity: 1, size: "Grande" }],
    },
    // Venta a público general → sin descuento
    { customerId: null, paymentMethod: "transfer", items: [{ productId: concha, quantity: 3 }] },
  ];

  for (const sale of sales) await createSale(sale);
  console.log(`✅ ${sales.length} ventas de ejemplo registradas`);
}

async function main() {
  await connectDB();
  let freshProducts = false;
  let freshCustomers = false;

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(SAMPLE_PRODUCTS);
    freshProducts = true;
    console.log(`✅ ${SAMPLE_PRODUCTS.length} productos de ejemplo creados`);
  } else {
    console.log("↷ Ya hay productos, no se insertó ninguno");
  }

  if ((await Customer.countDocuments()) === 0) {
    await Customer.insertMany(SAMPLE_CUSTOMERS);
    freshCustomers = true;
    console.log(`✅ ${SAMPLE_CUSTOMERS.length} clientes de ejemplo creados`);
  } else {
    console.log("↷ Ya hay clientes, no se insertó ninguno");
  }

  if (freshProducts && freshCustomers && (await Sale.countDocuments()) === 0) {
    await seedSales();
  }

  console.log("✅ Listo. Base de datos preparada para desarrollo.");
}

main()
  .catch((err) => {
    console.error("❌ Error al sembrar datos:", err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
