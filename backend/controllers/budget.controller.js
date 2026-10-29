const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { checkBudgetAlert } = require("../services/budgetAlert.service");
const { getAccessibleCategory } = require("../utils/categoryAccess");
const {
  currentMonth,
  isValidMonth,
  isValidObjectId,
  monthRange,
} = require("../utils/validation");

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

function normalizeBudgetPayload(body, { partial = false } = {}) {
  const payload = {};
  const errors = [];

  if (body.category !== undefined) payload.category = body.category;
  else if (!partial) errors.push("Category is required");

  if (body.month !== undefined) {
    if (!isValidMonth(body.month)) errors.push("Month must be in YYYY-MM format");
    else payload.month = body.month;
  } else if (!partial) {
    errors.push("Month is required");
  }

  if (body.limitAmount !== undefined) {
    const limit = Number(body.limitAmount);
    if (!Number.isFinite(limit) || limit <= 0) {
      errors.push("Limit must be a number greater than zero");
    } else {
      payload.limitAmount = limit;
    }
  } else if (!partial) {
    errors.push("Limit amount is required");
  }

  if (body.alertPercentage !== undefined) {
    const percentage = Number(body.alertPercentage);
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
      errors.push("Alert percentage must be between 1 and 100");
    } else {
      payload.alertPercentage = percentage;
    }
  }

  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);

  return { payload, errors };
}

async function assertExpenseCategory(userId, categoryId) {
  const { category, error } = await getAccessibleCategory(userId, categoryId, "expense");
  if (error) return { error };
  return { category };
}

exports.getAllBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user.id, isActive: true }).populate(
      "category",
      "name type icon"
    );
    res.json({ success: true, budgets });
  } catch (e) {
    next(e);
  }
};

exports.getBudgetsByMonth = async (req, res, next) => {
  try {
    if (!isValidMonth(req.params.month)) {
      return invalid(res, "Month must be in YYYY-MM format");
    }
    const budgets = await Budget.find({
      user: req.user.id,
      month: req.params.month,
    }).populate("category", "name type");
    res.json({ success: true, budgets });
  } catch (e) {
    next(e);
  }
};

exports.createBudget = async (req, res, next) => {
  try {
    const { payload, errors } = normalizeBudgetPayload(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { category, error } = await assertExpenseCategory(
      req.user.id,
      payload.category
    );
    if (error) return invalid(res, error);

    // One budget per category per month: re-posting updates the existing goal
    // instead of silently duplicating it.
    const existing = await Budget.findOne({
      user: req.user.id,
      category: category._id,
      month: payload.month,
    });

    if (existing) {
      if (payload.limitAmount !== undefined) existing.limitAmount = payload.limitAmount;
      if (payload.alertPercentage !== undefined) {
        existing.alertPercentage = payload.alertPercentage;
      }
      existing.isActive = true;
      await existing.save();

      checkBudgetAlert(req.user._id, category._id, "expense").catch(() => {});

      return res.status(201).json({
        success: true,
        message: "Budget updated",
        updated: true,
        budget: existing,
      });
    }

    const budget = await Budget.create({
      user: req.user.id,
      category: category._id,
      month: payload.month,
      limitAmount: payload.limitAmount,
      alertPercentage:
        payload.alertPercentage !== undefined ? payload.alertPercentage : 80,
    });

    checkBudgetAlert(req.user._id, category._id, "expense").catch(() => {});

    res.status(201).json({
      success: true,
      message: "Budget created",
      budget,
    });
  } catch (e) {
    next(e);
  }
};

exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user.id });
    if (!budget) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const { payload, errors } = normalizeBudgetPayload(req.body || {}, {
      partial: true,
    });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    if (payload.category !== undefined) {
      const { category, error } = await assertExpenseCategory(
        req.user.id,
        payload.category
      );
      if (error) return invalid(res, error);
      budget.category = category._id;
    }
    if (payload.month !== undefined) budget.month = payload.month;
    if (payload.limitAmount !== undefined) budget.limitAmount = payload.limitAmount;
    if (payload.alertPercentage !== undefined) {
      budget.alertPercentage = payload.alertPercentage;
    }
    if (payload.isActive !== undefined) budget.isActive = payload.isActive;

    await budget.save();
    checkBudgetAlert(req.user._id, budget.category, "expense").catch(() => {});

    res.json({ success: true, message: "Updated", budget });
  } catch (e) {
    next(e);
  }
};

exports.deleteBudget = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!budget) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.getBudgetStatus = async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    if (!isValidMonth(month)) {
      return invalid(res, "Month must be in YYYY-MM format");
    }

    const { start, end } = monthRange(month);
    const budgets = await Budget.find({
      user: req.user.id,
      month,
      isActive: true,
    }).populate("category", "name");

    const status = [];
    for (const b of budgets) {
      const agg = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            category: b.category?._id || b.category,
            type: "expense",
            deletedAt: null,
            date: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const used = agg[0]?.total || 0;
      const pct = b.limitAmount ? (used / b.limitAmount) * 100 : 0;
      status.push({
        budget: b,
        used,
        remaining: b.limitAmount - used,
        percentage: Math.round(pct),
        status:
          pct >= 100 ? "exceeded" : pct >= b.alertPercentage ? "warning" : "ok",
      });
    }
    res.json({ success: true, month, status });
  } catch (e) {
    next(e);
  }
};
