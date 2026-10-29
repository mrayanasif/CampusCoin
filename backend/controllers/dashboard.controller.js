
const Transaction = require("../models/Transaction");
const SavingTip = require("../models/SavingTip");
const Insight = require("../models/Insight");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Category = require("../models/Category");
const Budget = require("../models/Budget");

const {
  processDueRecurringForUser,
} = require("../services/recurring.service");

const {
  currentMonth,
  monthRange,
} = require("../utils/validation");

const SPENDING_COLORS = [
  "#7f1d3a",
  "#d97706",
  "#2563eb",
  "#16a34a",
  "#a855f7",
  "#0ea5e9",
  "#f43f5e",
];

const TIP_SORT = {
  isPinned: -1,
  priority: -1,
  potentialSavings: -1,
};

// Get the authenticated user's actual database record.
async function getAuthenticatedUser(req) {
  const id = req.user?.id || req.user?._id;

  if (!id) return null;

  return User.findById(id).select("-password");
}

// Create the current month's allowance transaction if missing.
async function ensureMonthlyAllowance(user, start, end) {
  const allowance = Number(user.monthlyAllowance || 0);

  if (!Number.isFinite(allowance) || allowance <= 0) {
    return;
  }

  const existing = await Transaction.findOne({
    user: user._id,
    type: "income",
    description: "Monthly allowance",
    date: { $gte: start, $lt: end },
  }).select("_id");

  if (existing) return;

  let category = await Category.findOne({
    name: "Allowance",
    type: "income",
  });

  if (!category) {
    try {
      category = await Category.create({
        name: "Allowance",
        type: "income",
        icon: "💰",
        isDefault: true,
      });
    } catch (error) {
      category = await Category.findOne({
        name: "Allowance",
        type: "income",
      });

      if (!category) throw error;
    }
  }

  await Transaction.create({
    user: user._id,
    type: "income",
    category: category._id,
    description: "Monthly allowance",
    amount: allowance,
    date: new Date(),
    source: "manual",
  });
}

async function expenseByCategory(userId, start, end) {
  return Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        deletedAt: null,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    { $sort: { total: -1 } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $unwind: {
        path: "$cat",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        total: 1,
        name: {
          $ifNull: ["$cat.name", "Uncategorized"],
        },
      },
    },
  ]);
}

async function currentMonthBudgetStatus(
  userId,
  month,
  start,
  end
) {
  const budgets = await Budget.find({
    user: userId,
    month,
    isActive: true,
  }).populate("category", "name");

  const result = [];

  for (const budget of budgets) {
    const categoryId =
      budget.category?._id || budget.category;

    const agg = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          category: categoryId,
          type: "expense",
          deletedAt: null,
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const used = agg[0]?.total || 0;
    const name = budget.category?.name || "Category";

    const percentage = budget.limitAmount
      ? Math.round((used / budget.limitAmount) * 100)
      : 0;

    result.push({
      category: name,
      limit: budget.limitAmount,
      used,
      percentage,
      _id: budget._id,
      categoryId,
      categoryName: name,
      name,
      spent: used,
      month: budget.month,
    });
  }

  return result;
}

// Calculate this month's income, expenses, and balance.
// If no allowance transaction exists, use the saved profile allowance.
async function getMonthlyTotals(user, start, end) {
  const userId = user._id;

  const totals = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        deletedAt: null,
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income =
    totals.find((item) => item._id === "income")?.total || 0;

  const expense =
    totals.find((item) => item._id === "expense")?.total || 0;

  const allowanceTransaction = await Transaction.findOne({
    user: userId,
    type: "income",
    description: "Monthly allowance",
    deletedAt: null,
    date: { $gte: start, $lt: end },
  }).select("_id");

  if (!allowanceTransaction) {
    income += Number(user.monthlyAllowance || 0);
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = user._id;

    try {
      await processDueRecurringForUser(userId);
    } catch (error) {
      console.error(
        "Recurring processing error:",
        error.message
      );
    }

    const month = currentMonth();
    const { start, end } = monthRange(month);

    try {
      await ensureMonthlyAllowance(user, start, end);
    } catch (error) {
      console.error(
        "Failed to create monthly allowance transaction:",
        error.message
      );
    }

    const { income, expense, balance } =
      await getMonthlyTotals(user, start, end);

    const topCategory = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          deletedAt: null,
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: "$cat" },
      {
        $project: {
          _id: 0,
          category: "$cat.name",
          total: 1,
        },
      },
    ]);

    const breakdownRows = await expenseByCategory(
      userId,
      start,
      end
    );

    const spendingBreakdown = breakdownRows.map(
      (row, index) => ({
        category: row.name,
        total: row.total,
        name: row.name,
        value: row.total,
        categoryId: row.categoryId,
        color:
          SPENDING_COLORS[index % SPENDING_COLORS.length],
      })
    );

    const budgets = await currentMonthBudgetStatus(
      userId,
      month,
      start,
      end
    );

    let insight = await Insight.findOne({
      user: userId,
      month,
    });

    if (!insight) {
      try {
        const { generateInsightForUser } = require("../services/insight.service");
        insight = await generateInsightForUser(userId, { month });
      } catch (err) {
        console.warn("Auto-generate dashboard insight failed:", err.message);
      }
    }

    let tips = await SavingTip.find({
      user: userId,
      isDismissed: false,
    })
      .sort(TIP_SORT)
      .limit(3);

    // If still no tips, populate default tips
    if (tips.length === 0) {
      try {
        const { generateTipsForUser } = require("../services/tip.service");
        tips = await generateTipsForUser(userId);
        tips = (tips || []).slice(0, 3);
      } catch (err) {
        console.warn("Auto-generate tips failed:", err.message);
      }
    }

    const unread = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return res.json({
      success: true,
      user: {
        name: user.name,
        monthlyAllowance: user.monthlyAllowance || 0,
        savingsGoal: user.savingsGoal || 0,
      },
      balance: {
        income,
        expense,
        total: balance,
      },
      topCategory: topCategory[0] || null,
      tips,
      insight,
      unreadNotifications: unread,
      month,
      spendingBreakdown,
      budgets,
    });
  } catch (error) {
    next(error);
  }
};

exports.getGreeting = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hour = new Date().getHours();

    let greeting = "Hello";

    if (hour < 12) {
      greeting = "Good Morning";
    } else if (hour < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    return res.json({
      success: true,
      greeting: `${greeting}, ${user.name}!`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopCategory = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const month = currentMonth();
    const { start, end } = monthRange(month);

    const data = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: "expense",
          deletedAt: null,
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: "$cat" },
      {
        $project: {
          _id: 0,
          category: "$cat.name",
          total: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      topCategory: data[0] || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBudgetVsActual = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const month = currentMonth();
    const { start, end } = monthRange(month);

    const data = await currentMonthBudgetStatus(
      user._id,
      month,
      start,
      end
    );

    return res.json({
      success: true,
      month,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBalance = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const month = currentMonth();
    const { start, end } = monthRange(month);

    try {
      await ensureMonthlyAllowance(user, start, end);
    } catch (error) {
      console.error(
        "Failed to create monthly allowance transaction:",
        error.message
      );
    }

    const { income, expense, balance } =
      await getMonthlyTotals(user, start, end);

    return res.json({
      success: true,
      income,
      expense,
      balance,
      total: balance,
    });
  } catch (error) {
    next(error);
  }
};
