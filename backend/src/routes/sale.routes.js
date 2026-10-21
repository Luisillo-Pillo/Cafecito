const { Router } = require("express");
const controller = require("../controllers/sale.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { staff } = require("../middleware/auth");

const router = Router();

// Ventas: vendedor o admin
router.post("/", staff, asyncHandler(controller.create));
router.get("/", staff, asyncHandler(controller.list));
router.get("/:id", staff, asyncHandler(controller.getById));

module.exports = router;
