const { Router } = require("express");
const controller = require("../controllers/auth.controller");
const { asyncHandler } = require("../middleware/asyncHandler");
const { loginLimiter } = require("../middleware/loginLimiter");

const router = Router();

router.post("/login", loginLimiter, asyncHandler(controller.login));

module.exports = router;
