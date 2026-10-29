const express = require("express");
const router = express.Router();
const txnController = require("../controllers/transaction.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, txnController.getAllTransactions);
router.get("/recent", protect, txnController.getRecentTransactions);
router.get("/summary/monthly", protect, txnController.getMonthlySummary);
// Soft-deleted history (must be declared before "/:id" to avoid shadowing).
router.get("/deleted", protect, txnController.getDeletedTransactions);
router.post("/bulk-delete", protect, txnController.bulkDelete);
router.post("/:id/restore", protect, txnController.restoreTransaction);
router.get("/:id", protect, txnController.getTransaction);
router.post("/", protect, txnController.createTransaction);
router.put("/:id", protect, txnController.updateTransaction);
router.delete("/:id", protect, txnController.deleteTransaction);

module.exports = router;
