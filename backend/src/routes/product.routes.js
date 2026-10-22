const { Router } = require("express");
const controller = require("../controllers/product.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { adminOnly } = require("../middleware/auth");

const router = Router();

router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getById));
router.post("/", adminOnly, asyncHandler(controller.create));
router.put("/:id", adminOnly, asyncHandler(controller.update));
router.delete("/:id", adminOnly, asyncHandler(controller.remove));

module.exports = router;
