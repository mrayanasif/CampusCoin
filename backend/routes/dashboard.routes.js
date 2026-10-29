const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, dashboardController.getDashboard);
router.get("/greeting", protect, dashboardController.getGreeting);
router.get("/top-category", protect, dashboardController.getTopCategory);
router.get("/budget-vs-actual", protect, dashboardController.getBudgetVsActual);
router.get("/balance", protect, dashboardController.getBalance);

module.exports = router;