const { Router } = require("express");
const mongoose = require("mongoose");

const router = Router();

const READY_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    db: READY_STATES[mongoose.connection.readyState] ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
