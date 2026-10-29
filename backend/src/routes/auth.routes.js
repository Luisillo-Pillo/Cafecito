const { Router } = require("express");
const controller = require("../controllers/auth.controller");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.post("/login", asyncHandler(controller.login));

module.exports = router;
