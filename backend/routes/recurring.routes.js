const express = require("express");
const router = express.Router();
const recurringController = require("../controllers/recurring.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, recurringController.getAll);
router.post("/", protect, recurringController.create);
// Materialise all currently due occurrences (idempotent).
router.post("/process", protect, recurringController.processDue);
router.put("/:id", protect, recurringController.update);
router.put("/:id/toggle", protect, recurringController.toggleActive);
router.delete("/:id", protect, recurringController.remove);

module.exports = router;
