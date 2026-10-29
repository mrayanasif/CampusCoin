const Notification = require("../models/Notification");
const Budget = require("../models/Budget");
const { checkBudgetAlert } = require("../services/budgetAlert.service");
const { currentMonth, isValidObjectId } = require("../utils/validation");

exports.getAll = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (e) {
    next(e);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });
    res.json({ success: true, count });
  } catch (e) {
    next(e);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, message: "Marked read", notification });
  } catch (e) {
    next(e);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({
      success: true,
      message: "All marked read",
      modifiedCount: result.modifiedCount,
    });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.refreshBudgetAlerts = async (req, res, next) => {
  try {
    const month = currentMonth();

    const budgets = await Budget.find({
      user: req.user.id,
      month,
      isActive: true,
    });

    console.log(`🔍 Refreshing budget alerts for ${budgets.length} budgets`);

    for (const budget of budgets) {
      await checkBudgetAlert(req.user.id, budget.category, "expense");
    }

    res.json({
      success: true,
      message: `Checked ${budgets.length} budgets`,
      count: budgets.length,
    });
  } catch (e) {
    next(e);
  }
};
