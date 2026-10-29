const Bookmark = require("../models/Bookmark");
const SavingTip = require("../models/SavingTip");
const Insight = require("../models/Insight");
const { isValidObjectId } = require("../utils/validation");

const BOOKMARK_TYPES = ["saving_tip", "insight"];

async function referenceIsOwned(userId, type, referenceId) {
  const Model = type === "saving_tip" ? SavingTip : Insight;
  return Boolean(await Model.exists({ _id: referenceId, user: userId }));
}

exports.getAll = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: bookmarks.length, bookmarks });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { type, referenceId, title } = req.body || {};

    if (!BOOKMARK_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${BOOKMARK_TYPES.join(", ")}`,
      });
    }
    if (!isValidObjectId(referenceId)) {
      return res.status(400).json({
        success: false,
        message: "A valid referenceId is required",
      });
    }

    // Students can only bookmark their own tips/insights (SRS 1.7 isolation).
    if (!(await referenceIsOwned(req.user._id, type, referenceId))) {
      return res
        .status(404)
        .json({ success: false, message: "Referenced item not found" });
    }

    const existing = await Bookmark.findOne({
      user: req.user._id,
      referenceId,
      type,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already bookmarked",
      });
    }

    const bookmark = await Bookmark.create({
      user: req.user._id,
      type,
      referenceId,
      title: typeof title === "string" ? title.slice(0, 200) : "",
    });

    res.status(201).json({
      success: true,
      message: "Bookmarked",
      bookmark,
    });
  } catch (error) {
    console.error("Create bookmark error:", error);
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Bookmark not found" });
    }

    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found",
      });
    }

    res.json({ success: true, message: "Bookmark removed" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    next(error);
  }
};
