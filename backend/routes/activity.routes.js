const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/recent-views", protect, activityController.recentViews);
router.get("/recent-edits", protect, activityController.recentEdits);
router.get("/duplicates", protect, activityController.duplicates);
router.get("/unusual", protect, activityController.unusual);
router.get("/forecast", protect, activityController.forecast);

module.exports = router;