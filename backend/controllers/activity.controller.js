const ActivityLog = require("../models/ActivityLog");
const Transaction = require("../models/Transaction");
const { currentMonth } = require("../utils/validation");

async function recentTransactionsForAction(userId, action, limit = 10) {
  const logs = await ActivityLog.find({ user: userId, action })
    .sort({ createdAt: -1 })
    .limit(limit);

  const ids = [...new Set(logs.map((log) => String(log.referenceId)).filter(Boolean))];

  return Transaction.find({
    _id: { $in: ids },
    user: userId,
    deletedAt: null,
  }).populate("category", "name type");
}

exports.recentViews = async (req, res, next) => {
  try {
    const transactions = await recentTransactionsForAction(
      req.user.id,
      "view_transaction"
    );
    res.json({ success: true, transactions });
  } catch (e) {
    next(e);
  }
};

exports.recentEdits = async (req, res, next) => {
  try {
    const transactions = await recentTransactionsForAction(
      req.user.id,
      "edit_transaction"
    );
    res.json({ success: true, transactions });
  } catch (e) {
    next(e);
  }
};

exports.duplicates = async (req, res, next) => {
  try {
    const duplicates = await Transaction.aggregate([
      { $match: { user: req.user._id, deletedAt: null } },
      {
        $group: {
          _id: { amount: "$amount", date: "$date", category: "$category" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: "categories",
          localField: "_id.category",
          foreignField: "_id",
          as: "cat",
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          ids: 1,
          categoryName: { $ifNull: [{ $arrayElemAt: ["$cat.name", 0] }, "Uncategorized"] },
        },
      },
    ]);
    res.json({ success: true, duplicates });
  } catch (e) {
    next(e);
  }
};

exports.unusual = async (req, res, next) => {
  try {
    const all = await Transaction.find({
      user: req.user.id,
      type: "expense",
      deletedAt: null,
    }).populate("category", "name type");

    if (all.length === 0) {
      return res.json({ success: true, average: 0, threshold: 0, unusual: [] });
    }

    const amounts = all.map((t) => t.amount);
    const average = amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
    const threshold = average * 3;

    const unusual = all.filter((t) => t.amount > threshold);
    res.json({
      success: true,
      average: Math.round(average),
      threshold: Math.round(threshold),
      unusual,
    });
  } catch (e) {
    next(e);
  }
};

exports.forecast = async (req, res, next) => {
  try {
    const six = new Date();
    six.setMonth(six.getMonth() - 6);

    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, deletedAt: null, date: { $gte: six } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    const expenseByMonth = data
      .filter((d) => d._id.type === "expense")
      .map((d) => ({ month: d._id.month, total: d.total }));

    const monthlyTotals = expenseByMonth.map((d) => d.total);
    const average = monthlyTotals.length
      ? monthlyTotals.reduce((total, amount) => total + amount, 0) /
        monthlyTotals.length
      : 0;

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    res.json({
      success: true,
      forecast: Math.round(average),
      basedOnMonths: monthlyTotals.length,
      month: nextMonth.toISOString().slice(0, 7),
      monthlyExpense: expenseByMonth,
      currentMonth: currentMonth(),
    });
  } catch (e) {
    next(e);
  }
};
