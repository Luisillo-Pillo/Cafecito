const { Router } = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// GET /api/orders - listar compras (con datos básicos del cliente)
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate("customer", "name email");
    res.json(orders);
  })
);

// GET /api/orders/:id - detalle
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate("customer", "name email");
    if (!order) return res.status(404).json({ message: "Compra no encontrada" });
    res.json(order);
  })
);

// POST /api/orders - registrar una compra a partir del carrito del POS
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La compra necesita al menos un producto" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Cliente no encontrado" });

    const products = await Product.find({
      _id: { $in: items.map((item) => item.productId) },
    });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const orderItems = [];
    for (const { productId, qty, size } of items) {
      const product = productMap.get(productId);
      if (!product) {
        return res.status(400).json({ message: `Producto ${productId} no encontrado` });
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ message: `Cantidad inválida para ${product.name}` });
      }

      let price;
      let sizeName;
      if (product.category === "bebida") {
        const chosenSize = product.sizes.find((s) => s.name === size);
        if (!chosenSize) {
          return res.status(400).json({ message: `Selecciona un tamaño válido para ${product.name}` });
        }
        price = chosenSize.price;
        sizeName = chosenSize.name;
      } else {
        price = product.price;
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        ...(sizeName && { size: sizeName }),
        price,
        qty,
      });
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = await Order.create({ customer: customer._id, items: orderItems, total });
    res.status(201).json(order);
  })
);

module.exports = router;
