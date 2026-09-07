const { Router } = require("express");
const Product = require("../models/Product");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// GET /api/products - listar
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
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
