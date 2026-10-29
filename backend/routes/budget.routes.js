const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budget.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, budgetController.getAllBudgets);
router.get("/status", protect, budgetController.getBudgetStatus);
router.get("/month/:month", protect, budgetController.getBudgetsByMonth);
router.post("/", protect, budgetController.createBudget);
router.put("/:id", protect, budgetController.updateBudget);
router.delete("/:id", protect, budgetController.deleteBudget);

module.exports = router;