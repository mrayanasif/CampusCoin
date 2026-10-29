const SavingTip = require("../models/SavingTip");
const { generateTipsForUser } = require("../services/tip.service");

// Pinned tips first, then by saving impact (SRS: ranked by potential savings).
const TIP_SORT = { isPinned: -1, priority: -1, potentialSavings: -1 };

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

exports.getAllTips = async (req, res, next) => {
  try {
    let tips = await SavingTip.find({
      user: req.user.id,
      isDismissed: false,
    }).sort(TIP_SORT);

    // Nothing live (first visit, or all dismissed): generate from history.
    if (tips.length === 0) {
      tips = await generateTipsForUser(req.user.id);
      tips = tips.sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          (b.priority || 0) - (a.priority || 0) ||
          (b.potentialSavings || 0) - (a.potentialSavings || 0)
      );
    }

    res.json({ success: true, count: tips.length, tips });
  } catch (error) {
    next(error);
  }
};

exports.getTopTips = async (req, res, next) => {
  try {
    const tips = await SavingTip.find({
      user: req.user.id,
      isDismissed: false,
    })
      .sort(TIP_SORT)
      .limit(3);

    res.json({ success: true, tips });
  } catch (error) {
    next(error);
  }
};

exports.generateTips = async (req, res, next) => {
  try {
    const tips = await generateTipsForUser(req.user.id);
    res.json({ success: true, message: "Tips generated", tips });
  } catch (error) {
    next(error);
  }
};

exports.togglePin = async (req, res, next) => {
  try {
    const tip = await SavingTip.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!tip) return res.status(404).json({ success: false, message: "Not found" });

    tip.isPinned = !tip.isPinned;
    await tip.save();
    res.json({ success: true, message: "Pin toggled", tip });
  } catch (error) {
    next(error);
  }
};

exports.dismissTip = async (req, res, next) => {
  try {
    const tip = await SavingTip.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isDismissed: true, isPinned: false },
      { new: true }
    );

    if (!tip) {
      return res.status(404).json({ success: false, message: "Tip not found" });
    }

    res.json({ success: true, message: "Dismissed", tip });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const tip = await SavingTip.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!tip) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, tip });
  } catch (error) {
    next(error);
  }
};
