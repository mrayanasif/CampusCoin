const express = require("express");
const router = express.Router();
const bookmarkController = require("../controllers/bookmark.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, bookmarkController.getAll);
router.post("/", protect, bookmarkController.create);
router.delete("/:id", protect, bookmarkController.remove);

module.exports = router;