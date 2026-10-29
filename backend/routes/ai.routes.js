const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimit.middleware");

// AI endpoints can be called while typing, so allow a higher but still bounded
// rate: 30 requests/minute per client IP across /api/ai.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many AI requests. Please try again in a minute.",
  })
);

router.post("/categorize", protect, aiController.categorize);
router.post("/categorize/feedback", protect, aiController.saveFeedback);
router.get("/classification-history", protect, aiController.getHistory);
router.post("/chatbot", protect, aiController.chatbot);

module.exports = router;
