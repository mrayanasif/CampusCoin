const Transaction = require("../models/Transaction");
const Category = require("../models/Category"); // ← NEW: needed to seed allowance
const User = require("../models/User"); // ← NEW: needed for summary fallback
const Budget = require("../models/Budget");
const ActivityLog = require("../models/ActivityLog");
const { checkBudgetAlert } = require("../services/budgetAlert.service");
const { getAccessibleCategory } = require("../utils/categoryAccess");
const {
  currentMonth,
  escapeRegex,
  isValidMonth,
  isValidObjectId,
  monthRange,
  parseDate,
} = require("../utils/validation");

const TYPES = ["income", "expense"];
const SOURCES = ["manual", "csv", "ai", "recurring", "allowance"]; // ← added "allowance"

function isCurrentMonth(dateValue) {
  const date = new Date(dateValue);
  const now = new Date();
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isMonthlyAllowance(transaction, categoryName = "") {
  return (
    transaction.type === "income" &&
    (transaction.source === "allowance" ||
      String(transaction.description || "").trim().toLowerCase() === "monthly allowance" ||
      String(categoryName || "").trim().toLowerCase() === "allowance")
  );
}

async function syncMonthlyAllowance(userId, transaction, categoryName = "") {
  if (!isCurrentMonth(transaction.date) || !isMonthlyAllowance(transaction, categoryName)) {
    return;
  }

  await User.findByIdAndUpdate(userId, {
    $set: { monthlyAllowance: Number(transaction.amount) },
  });
}

async function getUserSavings(userId) {
  const user = await User.findById(userId);
  if (!user) return 0;

  const totals = await Transaction.aggregate([
    {
      $match: {
        user: user._id,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let totalIncome = totals.find((t) => t._id === "income")?.total || 0;
  const totalExpense = totals.find((t) => t._id === "expense")?.total || 0;

  const hasAllowance = await Transaction.exists({
    user: user._id,
    type: "income",
    deletedAt: null,
  });
  if (!hasAllowance && Number(user.monthlyAllowance) > 0) {
    totalIncome += Number(user.monthlyAllowance);
  }

  const netSavings = Math.max(0, totalIncome - totalExpense);

  if (typeof user.savings === "number" && user.savings > 0) {
    return Math.min(user.savings, netSavings);
  }

  if (netSavings > 0) {
    await User.findByIdAndUpdate(userId, { $set: { savings: netSavings } });
  }

  return netSavings;
}

exports.getSavingsBalance = async (req, res, next) => {
  try {
    const savings = await getUserSavings(req.user.id);
    res.json({ success: true, savings });
  } catch (e) {
    next(e);
  }
};

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

function buildDateFilter(from, to) {
  const filter = {};
  let hasDate = false;

  if (from !== undefined && from !== "") {
    const parsed = parseDate(from);
    if (!parsed) return { error: "Invalid 'from' date" };
    filter.$gte = parsed;
    hasDate = true;
  }
  if (to !== undefined && to !== "") {
    const parsed = parseDate(to);
    if (!parsed) return { error: "Invalid 'to' date" };
    filter.$lte = parsed;
    hasDate = true;
  }

  return hasDate ? { filter } : { filter: null };
}

async function resolveCategoryOrError(userId, categoryId, type) {
  const { category, error } = await getAccessibleCategory(userId, categoryId, type);
  if (error) return { error };
  return { category };
}

/**
 * ── NEW ───────────────────────────────────────────────────────────────
 * Find (or lazily create) the per-user income category used to record the
 * monthly allowance. Kept inside the transaction module so authController
 * only needs one import.
 * ─────────────────────────────────────────────────────────────────────
 */
async function findOrCreateAllowanceCategory(userId) {
  let category = await Category.findOne({
    user: userId,
    type: "income",
    name: { $regex: /^allowance$/i },
  });

  if (!category) {
    category = await Category.create({
      user: userId,
      name: "Allowance",
      type: "income",
    });
  }
  return category;
}

/**
 * ── NEW ───────────────────────────────────────────────────────────────
 * Seed a single income transaction for the monthly allowance.
 * Called from authController.register() right after User.create().
 * Returns the created transaction, or null if the amount is not positive.
 * Throws only if the DB write itself fails (register() wraps in try/catch).
 * ─────────────────────────────────────────────────────────────────────
 */
exports.seedAllowanceIncome = async (userId, amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const category = await findOrCreateAllowanceCategory(userId);

  return Transaction.create({
    user: userId,
    category: category._id,
    amount: numeric,
    type: "income",
    description: "Monthly allowance",
    date: new Date(),
    source: "allowance",
  });
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const { type, category, from, to, source, search, page, limit } = req.query;
    const filter = { user: req.user.id, deletedAt: null };

    if (type) {
      if (!TYPES.includes(type)) return invalid(res, "Type must be income or expense");
      filter.type = type;
    }

    if (category) {
      if (!isValidObjectId(category)) return invalid(res, "Invalid category filter");
      filter.category = category;
    }

    if (source) {
      if (!SOURCES.includes(source)) {
        return invalid(res, `Source must be one of: ${SOURCES.join(", ")}`);
      }
      filter.source = source;
    }

    const dateRange = buildDateFilter(from, to);
    if (dateRange.error) return invalid(res, dateRange.error);
    if (dateRange.filter) filter.date = dateRange.filter;

    if (search) {
      if (typeof search !== "string") return invalid(res, "Invalid search term");
      filter.description = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    const query = Transaction.find(filter)
      .populate("category", "name type icon")
      .sort({ date: -1, createdAt: -1 });

    if (page !== undefined || limit !== undefined) {
      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
      const total = await Transaction.countDocuments(filter);
      const transactions = await query.skip((pageNumber - 1) * pageSize).limit(pageSize);

      return res.json({
        success: true,
        count: transactions.length,
        transactions,
        total,
        page: pageNumber,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      });
    }

    const transactions = await query;
    res.json({ success: true, count: transactions.length, transactions });
  } catch (e) {
    next(e);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const t = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
      deletedAt: null,
    }).populate("category", "name type");

    if (!t) return res.status(404).json({ success: false, message: "Not found" });

    await ActivityLog.create({
      user: req.user.id,
      action: "view_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    res.json({ success: true, transaction: t });
  } catch (e) {
    next(e);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const { category, amount, type, description, date, isRecurring } = req.body || {};

    if (!TYPES.includes(type)) return invalid(res, "Type must be income or expense");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return invalid(res, "Amount must be a number greater than zero");
    }

    const { category: resolvedCategory, error } = await resolveCategoryOrError(
      req.user.id,
      category,
      type
    );
    if (error) return invalid(res, error);

    const parsedDate = date !== undefined ? parseDate(date) : new Date();
    if (!parsedDate) return invalid(res, "Invalid date");

    if (description !== undefined && typeof description !== "string") {
      return invalid(res, "Description must be a string");
    }

    let isDeductedFromSavings = false;
    let actualDeductedAmount = 0;

    if (type === "expense") {
      const monthStr = parsedDate.toISOString().slice(0, 7);
      const budget = await Budget.findOne({
        user: req.user.id,
        category: resolvedCategory._id,
        month: monthStr,
        isActive: true,
      });

      if (budget) {
        const { start, end } = monthRange(monthStr);
        const agg = await Transaction.aggregate([
          {
            $match: {
              user: req.user._id,
              category: resolvedCategory._id,
              type: "expense",
              deletedAt: null,
              date: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const alreadySpent = agg[0]?.total || 0;
        const projected = alreadySpent + numericAmount;

        if (projected > budget.limitAmount) {
          const excess = projected - budget.limitAmount;
          const availableSavings = await getUserSavings(req.user.id);

          if (!req.body.deductFromSavings) {
            return res.status(400).json({
              success: false,
              requiresSavingsDeduction: true,
              excessAmount: excess,
              availableSavings,
              hasEnoughSavings: availableSavings >= excess,
              message: `This expense exceeds your ${resolvedCategory.name} budget by ${excess}. Excess amount will be deducted from your savings.`,
            });
          }

          if (availableSavings < excess) {
            return res.status(400).json({
              success: false,
              insufficientSavings: true,
              excessAmount: excess,
              availableSavings,
              message: `You don't have enough savings! Available savings is ${availableSavings}, but ${excess} is needed.`,
            });
          }

          isDeductedFromSavings = true;
          actualDeductedAmount = excess;

          const remainingSavings = Math.max(0, availableSavings - excess);
          await User.findByIdAndUpdate(req.user.id, {
            $set: { savings: remainingSavings },
          });
        }
      }
    }

    const t = await Transaction.create({
      user: req.user.id,
      category: resolvedCategory._id,
      amount: numericAmount,
      type,
      description: description ? description.trim() : "",
      date: parsedDate,
      isRecurring: Boolean(isRecurring),
      source: "manual",
      deductedFromSavings: isDeductedFromSavings,
      savingsDeductedAmount: actualDeductedAmount,
    });

    await syncMonthlyAllowance(req.user.id, t, resolvedCategory.name);

    await ActivityLog.create({
      user: req.user.id,
      action: "create_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    checkBudgetAlert(req.user._id, resolvedCategory._id, type).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Transaction added",
      transaction: t,
    });
  } catch (e) {
    next(e);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const existing = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
      deletedAt: null,
    });
    if (!existing) return res.status(404).json({ success: false, message: "Not found" });

    const body = req.body || {};
    const update = {};

    if (body.type !== undefined) {
      if (!TYPES.includes(body.type)) return invalid(res, "Type must be income or expense");
      update.type = body.type;
    }

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return invalid(res, "Amount must be a number greater than zero");
      }
      update.amount = amount;
    }

    if (body.date !== undefined) {
      const parsed = parseDate(body.date);
      if (!parsed) return invalid(res, "Invalid date");
      update.date = parsed;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return invalid(res, "Description must be a string");
      }
      update.description = body.description.trim();
    }

    if (body.isRecurring !== undefined) update.isRecurring = Boolean(body.isRecurring);

    const nextType = update.type || existing.type;
    const nextCategoryId = body.category !== undefined ? body.category : existing.category;

    if (body.category !== undefined || update.type !== undefined) {
      const { category: resolvedCategory, error } = await resolveCategoryOrError(
        req.user.id,
        nextCategoryId,
        nextType
      );
      if (error) return invalid(res, error);
      update.category = resolvedCategory._id;
    }

    let isDeductedFromSavings = existing.deductedFromSavings || false;
    let actualDeductedAmount = existing.savingsDeductedAmount || 0;

    if (nextType === "expense") {
      const targetDate = update.date || existing.date;
      const monthStr = targetDate.toISOString().slice(0, 7);
      const targetCategoryId = update.category || existing.category;
      const targetAmount = update.amount !== undefined ? update.amount : existing.amount;

      const budget = await Budget.findOne({
        user: req.user.id,
        category: targetCategoryId,
        month: monthStr,
        isActive: true,
      });

      if (budget) {
        const { start, end } = monthRange(monthStr);
        const agg = await Transaction.aggregate([
          {
            $match: {
              user: req.user._id,
              _id: { $ne: existing._id },
              category: targetCategoryId,
              type: "expense",
              deletedAt: null,
              date: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const alreadySpent = agg[0]?.total || 0;
        const projected = alreadySpent + targetAmount;

        if (projected > budget.limitAmount) {
          const excess = projected - budget.limitAmount;
          const availableSavings = await getUserSavings(req.user.id);

          if (!body.deductFromSavings) {
            return res.status(400).json({
              success: false,
              requiresSavingsDeduction: true,
              excessAmount: excess,
              availableSavings,
              hasEnoughSavings: availableSavings >= excess,
              message: `This expense exceeds your budget by ${excess}. Excess amount will be deducted from your savings.`,
            });
          }

          if (availableSavings < excess) {
            return res.status(400).json({
              success: false,
              insufficientSavings: true,
              excessAmount: excess,
              availableSavings,
              message: `You don't have enough savings! Available savings is ${availableSavings}, but ${excess} is needed.`,
            });
          }

          isDeductedFromSavings = true;
          actualDeductedAmount = excess;

          const remainingSavings = Math.max(0, availableSavings - excess);
          await User.findByIdAndUpdate(req.user.id, {
            $set: { savings: remainingSavings },
          });
        }
      }
    }

    update.deductedFromSavings = isDeductedFromSavings;
    update.savingsDeductedAmount = actualDeductedAmount;

    const t = await Transaction.findOneAndUpdate(
      { _id: existing._id, user: req.user.id, deletedAt: null },
      update,
      { new: true, runValidators: true }
    ).populate("category", "name type");

    await syncMonthlyAllowance(req.user.id, t, t.category?.name);

    await ActivityLog.create({
      user: req.user.id,
      action: "edit_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    checkBudgetAlert(req.user._id, t.category._id || t.category, t.type).catch(() => {});

    res.json({ success: true, message: "Updated", transaction: t });
  } catch (e) {
    next(e);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const t = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!t) return res.status(404).json({ success: false, message: "Not found" });

    await ActivityLog.create({
      user: req.user.id,
      action: "delete_transaction",
      referenceId: t._id,
      referenceModel: "Transaction",
    });

    checkBudgetAlert(req.user._id, t.category, t.type).catch(() => {});

    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.getDeletedTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id,
      deletedAt: { $ne: null },
    })
      .populate("category", "name type icon")
      .sort({ deletedAt: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (e) {
    next(e);
  }
};

exports.restoreTransaction = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        deletedAt: { $ne: null },
      },
      { deletedAt: null },
      { new: true, runValidators: true }
    ).populate("category", "name type");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await ActivityLog.create({
      user: req.user.id,
      action: "create_transaction",
      referenceId: transaction._id,
      referenceModel: "Transaction",
      metadata: { restored: true },
    });

    if (transaction.type === "expense") {
      checkBudgetAlert(
        req.user._id,
        transaction.category?._id || transaction.category,
        transaction.type
      ).catch(() => {});
    }

    res.json({ success: true, message: "Transaction restored", transaction });
  } catch (e) {
    next(e);
  }
};

exports.bulkDelete = async (req, res, next) => {
  try {
    const ids = (req.body || {}).ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return invalid(res, "ids must be a non-empty array");
    }
    if (ids.length > 200) {
      return invalid(res, "Cannot delete more than 200 transactions at once");
    }
    if (!ids.every(isValidObjectId)) {
      return invalid(res, "ids must contain valid transaction ids");
    }

    const result = await Transaction.updateMany(
      { _id: { $in: ids }, user: req.user.id, deletedAt: null },
      { deletedAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} transaction(s) deleted`,
      deletedCount: result.modifiedCount,
    });
  } catch (e) {
    next(e);
  }
};

/**
 * ── UPDATED ───────────────────────────────────────────────────────────
 * Same output shape as before, with a safety net: if the month has zero
 * income transactions but the user's profile carries a monthlyAllowance,
 * surface the allowance so the dashboard never silently shows ₹0 for a
 * user whose allowance was saved but never seeded (legacy accounts, or a
 * seed that failed during registration).
 * ─────────────────────────────────────────────────────────────────────
 */
exports.getMonthlySummary = async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();

    if (!isValidMonth(month)) {
      return invalid(res, "Invalid month, expected YYYY-MM");
    }

    const { start, end } = monthRange(month);
    const result = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          deletedAt: null,
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    let income = result.find((r) => r._id === "income")?.total || 0;
    const expense = result.find((r) => r._id === "expense")?.total || 0;

    let incomeFallback = false;
    if (income === 0) {
      const user = await User.findById(req.user.id).select("monthlyAllowance");
      if (user && Number(user.monthlyAllowance) > 0) {
        income = Number(user.monthlyAllowance);
        incomeFallback = true;
      }
    }

    res.json({
      success: true,
      month,
      income,
      expense,
      balance: income - expense,
      incomeFallback, // ← lets the UI label it "from allowance" if desired
    });
  } catch (e) {
    next(e);
  }
};

/**
 * ── NEW ───────────────────────────────────────────────────────────────
 * Dashboard summary: same idea as getMonthlySummary but always current
 * month and flattened into the fields a dashboard typically renders.
 * ─────────────────────────────────────────────────────────────────────
 */
exports.getSummary = async (req, res, next) => {
  try {
    const month = currentMonth();
    const { start, end } = monthRange(month);

    const [result, user] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            deletedAt: null,
            date: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      User.findById(req.user.id).select("monthlyAllowance savingsGoal"),
    ]);

    const incomeRow = result.find((r) => r._id === "income");
    const expenseRow = result.find((r) => r._id === "expense");

    const rawIncome = incomeRow?.total || 0;
    const totalExpenses = expenseRow?.total || 0;
    const allowance = Number(user?.monthlyAllowance) || 0;

    const totalIncome = rawIncome === 0 && allowance > 0 ? allowance : rawIncome;

    res.json({
      success: true,
      summary: {
        month,
        totalIncome,
        rawIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        monthlyAllowance: allowance,
        savingsGoal: Number(user?.savingsGoal) || 0,
        incomeFallback: rawIncome === 0 && allowance > 0,
        transactionCount: (incomeRow?.count || 0) + (expenseRow?.count || 0),
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.getRecentTransactions = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({
      user: req.user.id,
      action: { $in: ["view_transaction", "edit_transaction"] },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const ids = [...new Set(logs.map((l) => String(l.referenceId)).filter(Boolean))];
    const txns = await Transaction.find({
      _id: { $in: ids },
      user: req.user.id,
      deletedAt: null,
    }).populate("category", "name type");

    res.json({ success: true, transactions: txns });
  } catch (e) {
    next(e);
  }
};
