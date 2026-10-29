const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, categoryController.getAllCategories);
router.get("/type/:type", protect, categoryController.getCategoriesByType);
router.get("/:id", protect, categoryController.getCategory);
router.post("/", protect, categoryController.createCategory);
router.put("/:id", protect, categoryController.updateCategory);
router.delete("/:id", protect, categoryController.deleteCategory);

module.exports = router;