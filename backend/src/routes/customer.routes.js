const { Router } = require("express");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/customers?search=... - listar (con filtro opcional por nombre/correo/teléfono)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const filter = search
      ? {
          $or: [
            { name: new RegExp(escapeRegex(search), "i") },
            { email: new RegExp(escapeRegex(search), "i") },
            { phone: new RegExp(escapeRegex(search), "i") },
          ],
        }
      : {};
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  })
);

// GET /api/customers/:id - detalle
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Cliente no encontrado" });
    res.json(customer);
  })
);

// GET /api/customers/:id/orders - historial de compras
router.get(
  "/:id/orders",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  })
);

// POST /api/customers - registrar
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const customer = await Customer.create(req.body);
      res.status(201).json(customer);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: "Ya existe un cliente con ese correo" });
      }
      throw err;
    }
  })
);

// PUT /api/customers/:id - actualizar
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!customer) return res.status(404).json({ message: "Cliente no encontrado" });
      res.json(customer);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: "Ya existe un cliente con ese correo" });
      }
      throw err;
    }
  })
);

// DELETE /api/customers/:id - eliminar
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: "Cliente no encontrado" });
    res.status(204).send();
  })
);

module.exports = router;
