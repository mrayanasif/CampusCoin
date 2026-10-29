const express = require("express");
const router = express.Router();
const insightController = require("../controllers/insight.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, insightController.getAllInsights);
router.get("/current", protect, insightController.getCurrentInsight);
router.post("/generate", protect, insightController.generateInsight);
router.get("/:month", protect, insightController.getInsightByMonth);
router.delete("/:id", protect, insightController.deleteInsight);

module.exports = router;