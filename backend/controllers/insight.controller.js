const Insight = require("../models/Insight");
const { generateInsightForUser } = require("../services/insight.service");
const { isValidMonth } = require("../utils/validation");

exports.getAllInsights = async (req, res, next) => {
  try {
    const insights = await Insight.find({ user: req.user._id }).sort({ month: -1 });
    res.json({ success: true, count: insights.length, insights });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentInsight = async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    let insight = await Insight.findOne({ user: req.user._id, month });
    if (!insight) {
      insight = await generateInsightForUser(req.user._id, { month });
    }
    res.json({ success: true, insight });
  } catch (error) {
    next(error);
  }
};

exports.getInsightByMonth = async (req, res, next) => {
  try {
    if (!isValidMonth(req.params.month)) {
      return res
        .status(400)
        .json({ success: false, message: "Month must be in YYYY-MM format" });
    }

    const insight = await Insight.findOne({
      user: req.user._id,
      month: req.params.month,
    });
    if (!insight) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, insight });
  } catch (error) {
    next(error);
  }
};

exports.generateInsight = async (req, res, next) => {
  try {
    const requestedMonth = (req.body && req.body.month) || req.query.month;

    if (requestedMonth !== undefined && !isValidMonth(requestedMonth)) {
      return res
        .status(400)
        .json({ success: false, message: "Month must be in YYYY-MM format" });
    }

    const insight = await generateInsightForUser(req.user._id, {
      month: requestedMonth,
    });

    if (!insight) {
      return res.status(400).json({
        success: false,
        message:
          "No transactions this month. Add some transactions first to generate insights.",
      });
    }

    res.json({
      success: true,
      message: "Insight generated successfully",
      insight,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteInsight = async (req, res, next) => {
  try {
    const insight = await Insight.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!insight) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    next(error);
  }
};
