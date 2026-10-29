const express = require("express");
const router = express.Router();
const noteController = require("../controllers/note.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, noteController.getAll);
router.get("/ref/:type/:id", protect, noteController.getByReference);
router.post("/", protect, noteController.create);
router.put("/:id", protect, noteController.update);
router.delete("/:id", protect, noteController.remove);

module.exports = router;