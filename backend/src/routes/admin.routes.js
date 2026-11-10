const { Router } = require("express");
const controller = require("../controllers/admin.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { adminOnly } = require("../middleware/auth");

const router = Router();

router.get("/", adminOnly, asyncHandler(controller.list));
router.post("/", adminOnly, asyncHandler(controller.create));
router.delete("/:id", adminOnly, asyncHandler(controller.remove));

module.exports = router;
