const express = require("express");
const router = express.Router();
const tipController = require("../controllers/savingTip.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, tipController.getAllTips);
router.get("/top", protect, tipController.getTopTips);
router.post("/generate", protect, tipController.generateTips);
router.put("/:id/pin", protect, tipController.togglePin);
router.put("/:id/dismiss", protect, tipController.dismissTip);

module.exports = router;