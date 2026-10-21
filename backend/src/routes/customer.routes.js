const { Router } = require("express");
const controller = require("../controllers/customer.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { staff, adminOnly } = require("../middleware/auth");

const router = Router();

// Clientes: vendedor o admin. Eliminar un cliente queda solo para admin.
router.get("/", staff, asyncHandler(controller.list));
router.get("/:id", staff, asyncHandler(controller.getById));
router.get("/:id/sales", staff, asyncHandler(controller.listSales));
router.post("/", staff, asyncHandler(controller.create));
router.put("/:id", staff, asyncHandler(controller.update));
router.delete("/:id", adminOnly, asyncHandler(controller.remove));

module.exports = router;
