const express = require("express");
const router = express.Router();
const notifController = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, notifController.getAll);
router.get("/unread-count", protect, notifController.getUnreadCount);
router.post("/refresh-budget-alerts", protect, notifController.refreshBudgetAlerts);
router.put("/read-all", protect, notifController.markAllRead);
router.put("/:id/read", protect, notifController.markRead);
router.delete("/:id", protect, notifController.remove);

module.exports = router;