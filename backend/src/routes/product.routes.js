const { Router } = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// GET /api/products - listar, ordenados por popularidad (unidades vendidas)
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sales = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.product", unitsSold: { $sum: "$items.qty" } } },
    ]);
    const unitsSoldByProduct = new Map(sales.map((s) => [String(s._id), s.unitsSold]));

    const products = await Product.find();
    products.sort((a, b) => {
      const soldA = unitsSoldByProduct.get(String(a._id)) ?? 0;
      const soldB = unitsSoldByProduct.get(String(b._id)) ?? 0;
      if (soldB !== soldA) return soldB - soldA;
      return a.name.localeCompare(b.name);
    });

    res.json(products);
  })
);

// GET /api/products/:id - detalle
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(product);
  })
);

// POST /api/products - crear
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  })
);

// PUT /api/products/:id - actualizar
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(product);
  })
);

// DELETE /api/products/:id - eliminar
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.status(204).send();
  })
);

module.exports = router;
