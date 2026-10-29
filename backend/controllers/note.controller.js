const Note = require("../models/Note");
const Transaction = require("../models/Transaction");
const SavingTip = require("../models/SavingTip");
const Insight = require("../models/Insight");
const { isValidObjectId } = require("../utils/validation");

const REFERENCE_TYPES = ["transaction", "saving_tip", "insight"];

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

async function referenceIsOwned(userId, referenceType, referenceId) {
  const Model =
    referenceType === "transaction"
      ? Transaction
      : referenceType === "saving_tip"
        ? SavingTip
        : Insight;

  const exists = await Model.exists({
    _id: referenceId,
    user: userId,
    // Notes cannot reference a soft-deleted transaction.
    ...(referenceType === "transaction" ? { deletedAt: null } : {}),
  });
  return Boolean(exists);
}

exports.getAll = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: notes.length, notes });
  } catch (e) {
    next(e);
  }
};

exports.getByReference = async (req, res, next) => {
  try {
    if (!REFERENCE_TYPES.includes(req.params.type)) {
      return invalid(
        res,
        `referenceType must be one of: ${REFERENCE_TYPES.join(", ")}`
      );
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const notes = await Note.find({
      user: req.user.id,
      referenceType: req.params.type,
      referenceId: req.params.id,
    });
    res.json({ success: true, notes });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { referenceType, referenceId, content } = req.body || {};

    if (!REFERENCE_TYPES.includes(referenceType)) {
      return invalid(
        res,
        `referenceType must be one of: ${REFERENCE_TYPES.join(", ")}`
      );
    }
    if (!isValidObjectId(referenceId)) {
      return invalid(res, "A valid referenceId is required");
    }
    if (typeof content !== "string" || !content.trim()) {
      return invalid(res, "Note content is required");
    }
    if (content.length > 2000) {
      return invalid(res, "Note content must be 2000 characters or fewer");
    }

    if (!(await referenceIsOwned(req.user.id, referenceType, referenceId))) {
      return res
        .status(404)
        .json({ success: false, message: "Referenced item not found" });
    }

    // Explicit field list: never trust a client-supplied `user`.
    const note = await Note.create({
      user: req.user.id,
      referenceType,
      referenceId,
      content: content.trim(),
    });

    res.status(201).json({ success: true, message: "Note added", note });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const { content } = req.body || {};
    if (typeof content !== "string" || !content.trim()) {
      return invalid(res, "Note content is required");
    }
    if (content.length > 2000) {
      return invalid(res, "Note content must be 2000 characters or fewer");
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { content: content.trim() },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated", note });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!note) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};
