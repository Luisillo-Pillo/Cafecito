const { Router } = require("express");
const controller = require("../controllers/product.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { adminOnly } = require("../middleware/auth");

const router = Router();

// Ver productos es público; crear/editar/eliminar solo admin (matriz de permisos)
router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getById));
router.post("/", adminOnly, asyncHandler(controller.create));
router.put("/:id", adminOnly, asyncHandler(controller.update));
router.delete("/:id", adminOnly, asyncHandler(controller.remove));

module.exports = router;
