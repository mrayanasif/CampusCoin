const express = require("express");
const router = express.Router();
const importController = require("../controllers/import.controller");
const { protect } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimit.middleware");

// Imports are heavier operations: 10 requests/minute per client IP.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many import requests. Please try again in a minute.",
  })
);

// Dry-run: parse rows and return AI category suggestions (no DB writes).
router.post("/preview", protect, importController.preview);
router.post("/csv", protect, importController.uploadCSV);
router.get("/batches", protect, importController.getBatches);
router.get("/batches/:id", protect, importController.getBatch);
router.post("/batches/:id/apply-ai", protect, importController.applyAI);

module.exports = router;
