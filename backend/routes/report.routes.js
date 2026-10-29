const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/category-wise", protect, reportController.categoryWise);
router.get("/income-expense", protect, reportController.incomeVsExpense);
router.get("/daily", protect, reportController.dailySummary);
router.get("/weekly", protect, reportController.weeklySummary);
router.get("/filter", protect, reportController.filteredReport);
router.get("/export/pdf", protect, reportController.exportPDF);
router.get("/export/image", protect, reportController.exportImage);
router.post("/share/email", protect, reportController.shareByEmail);

module.exports = router;