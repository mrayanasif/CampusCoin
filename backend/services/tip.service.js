const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const SavingTip = require("../models/SavingTip");
const TipTemplate = require("../models/TipTemplate");
const { clamp, currentMonth } = require("../utils/validation");

const formatNumber = (value) => Number(value || 0).toLocaleString();

// SRS: tips must be ranked by potential savings impact. Priority is therefore
// anchored on the estimated saving while keeping a sensible floor per type.
function impactPriority(basePriority, potentialSavings) {
  const impact = clamp(Math.round((potentialSavings || 0) / 60), 0, 90);
  return Math.max(basePriority || 0, impact);
}

function renderTemplate(template, values) {
  return String(template.message || "").replace(
    /\{(category|spent|limit|percent|month)\}/gi,
    (match, key) => {
      const value = values[key.toLowerCase()];
      return value === undefined ? match : String(value);
    }
  );
}

async function generateTipsForUser(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [transactions, budgets, templates, dismissedTips] = await Promise.all([
    Transaction.find({
      user: userId,
      deletedAt: null,
      date: { $gte: thirtyDaysAgo },
    }).populate("category", "name type"),
    Budget.find({ user: userId, month: currentMonth(), isActive: true }).populate(
      "category",
      "name"
    ),
    TipTemplate.find({ isActive: true }),
    SavingTip.find({ user: userId, isDismissed: true }).select("title"),
  ]);

  // Pinned tips are user-curated: keep them, only refresh the auto-generated
  // (unpinned) ones. Dismissed titles are remembered so a regeneration does not
  // resurrect a tip the student explicitly dismissed.
  await SavingTip.deleteMany({ user: userId, isDismissed: false, isPinned: false });

  const dismissedTitles = new Set(
    dismissedTips.map((tip) => String(tip.title || "").toLowerCase())
  );
  const tips = [];
  const existingTitles = new Set(
    (await SavingTip.find({ user: userId, isDismissed: false }).select("title")).map(
      (tip) => String(tip.title || "").toLowerCase()
    )
  );

  const addTip = (tip) => {
    const key = String(tip.title || "").toLowerCase();
    if (!key || dismissedTitles.has(key) || existingTitles.has(key)) return;
    existingTitles.add(key);
    tip.priority = impactPriority(tip.priority, tip.potentialSavings);
    tip.user = userId;
    tips.push(tip);
  };

  if (transactions.length === 0) {
    addTip({
      title: "Limit food delivery to 2 times a week",
      message: "Cooking simple meals on weekdays cuts down on delivery fees and restaurant markups.",
      potentialSavings: 25,
      priority: 25,
      source: "ai",
    });
    addTip({
      title: "Use student discounts for transport",
      message: "Take advantage of student semester passes or bus cards to save on daily commute.",
      potentialSavings: 15,
      priority: 20,
      source: "ai",
    });
    addTip({
      title: "Review unused subscriptions",
      message: "Audit streaming services and software subscriptions; cancel or split student plans.",
      potentialSavings: 10,
      priority: 15,
      source: "ai",
    });
  } else {
    const expenses = transactions.filter((t) => t.type === "expense");
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((total, t) => total + t.amount, 0);
    const totalExpense = expenses.reduce((total, t) => total + t.amount, 0);

    const byCategory = {};
    expenses.forEach((t) => {
      const name = t.category?.name || "Uncategorized";
      if (!byCategory[name]) byCategory[name] = 0;
      byCategory[name] += t.amount;
    });

    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      const percent = totalExpense ? Math.round((topAmount / totalExpense) * 100) : 0;

      if (percent > 30) {
        addTip({
          title: `Reduce your ${topCategory} spending`,
          message: `${topCategory} is ${percent}% of your total spending this month (₹${formatNumber(topAmount)}). Try setting a weekly limit to save more.`,
          potentialSavings: Math.round(topAmount * 0.2),
          priority: 10,
          source: "system",
        });
      }
    }

    for (const budget of budgets) {
      const categoryName = budget.category?.name;
      const spent = byCategory[categoryName] || 0;
      const percent = budget.limitAmount
        ? (spent / budget.limitAmount) * 100
        : 0;

      if (percent >= 100) {
        addTip({
          title: `${categoryName} budget exceeded`,
          message: `You've spent ₹${formatNumber(spent)} on ${categoryName} — that's over your ₹${formatNumber(budget.limitAmount)} budget. Slow down on ${categoryName} for the rest of the month.`,
          potentialSavings: Math.round(spent - budget.limitAmount),
          priority: 15,
          source: "system",
        });
      } else if (percent >= budget.alertPercentage) {
        addTip({
          title: `${categoryName} budget nearly used`,
          message: `You've used ${Math.round(percent)}% of your ${categoryName} budget (₹${formatNumber(spent)} of ₹${formatNumber(budget.limitAmount)}). Be careful with the rest.`,
          potentialSavings: Math.round(budget.limitAmount - spent),
          priority: 12,
          source: "system",
        });
      }
    }

    const smallTxns = expenses.filter((t) => t.amount < 500);
    if (smallTxns.length >= 10) {
      const smallTotal = smallTxns.reduce((total, t) => total + t.amount, 0);
      addTip({
        title: "Watch out for small frequent purchases",
        message: `You made ${smallTxns.length} small purchases under ₹500 this month, totaling ₹${formatNumber(smallTotal)}. These add up quickly — try consolidating.`,
        potentialSavings: Math.round(smallTotal * 0.15),
        priority: 8,
        source: "system",
      });
    }

    const subscriptionTotal = byCategory["Subscriptions"] || 0;
    if (subscriptionTotal > 0) {
      addTip({
        title: "Review your subscriptions",
        message: `You spent ₹${formatNumber(subscriptionTotal)} on subscriptions this month. Check which ones you actually use and cancel the rest.`,
        potentialSavings: Math.round(subscriptionTotal * 0.3),
        priority: 9,
        source: "system",
      });
    }

    if (income > 0 && totalExpense > income * 0.9) {
      addTip({
        title: "You're spending most of your income",
        message: `You've spent ₹${formatNumber(totalExpense)} out of ₹${formatNumber(income)} income this month. Try to keep expenses below 70% of income.`,
        potentialSavings: Math.round(totalExpense - income * 0.7),
        priority: 12,
        source: "system",
      });
    }

    if ((byCategory["Transport"] || 0) > 1000) {
      addTip({
        title: "Plan your transport ahead",
        message: `You spent ₹${formatNumber(byCategory["Transport"])} on transport. Using shared rides or planning trips in advance could help.`,
        potentialSavings: Math.round(byCategory["Transport"] * 0.15),
        priority: 6,
        source: "system",
      });
    }

    // SRS 1.6: compare the student's current-month spending against their own
    // historical average. Baseline = prior 3 FULL calendar months (current month
    // excluded). A tip is raised when current spend is >= 125% of that average.
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const historyStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)
    );

    const [currentMonthTotals, historyTotals] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "expense",
            deletedAt: null,
            date: { $gte: currentMonthStart },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "cat",
          },
        },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            name: { $ifNull: ["$cat.name", "Uncategorized"] },
            total: 1,
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "expense",
            deletedAt: null,
            date: { $gte: historyStart, $lt: currentMonthStart },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]),
    ]);

    const historyByCategory = new Map(
      historyTotals.map((row) => [String(row._id), row.total])
    );
    const HISTORICAL_AVERAGE_MONTHS = 3;
    const HISTORICAL_INCREASE_THRESHOLD = 1.25;

    for (const row of currentMonthTotals) {
      const monthlyAverage =
        (historyByCategory.get(String(row.categoryId)) || 0) /
        HISTORICAL_AVERAGE_MONTHS;

      // No baseline yet (new category / no prior spend): nothing to compare to.
      if (monthlyAverage <= 0) continue;
      if (row.total < monthlyAverage * HISTORICAL_INCREASE_THRESHOLD) continue;

      const increase = row.total - monthlyAverage;
      const growthPercent = Math.round((increase / monthlyAverage) * 100);

      addTip({
        title: `${row.name} spending is above your usual average`,
        message: `You've spent ₹${formatNumber(row.total)} on ${row.name} this month, ${growthPercent}% above your usual ₹${formatNumber(Math.round(monthlyAverage))}/month average for the previous ${HISTORICAL_AVERAGE_MONTHS} months. Trimming it back to your usual level would save about ₹${formatNumber(Math.round(increase))}.`,
        category: row.categoryId,
        // impact-scaled priority is applied by addTip.
        potentialSavings: Math.round(increase),
        priority: 13,
        source: "system",
      });
    }

    // Admin-managed tip templates: render active templates whose trigger
    // matches the student's current situation.
    const exceededBudget = budgets.find((b) => {
      const spent = byCategory[b.category?.name] || 0;
      return b.limitAmount > 0 && spent / b.limitAmount >= 1;
    });
    const nearLimitBudget = budgets.find((b) => {
      const spent = byCategory[b.category?.name] || 0;
      return (
        b.limitAmount > 0 &&
        spent / b.limitAmount >= (b.alertPercentage || 80) / 100
      );
    });
    const topCategoryInfo = sortedCategories[0];

    for (const template of templates) {
      const values = {
        category:
          (exceededBudget || nearLimitBudget)?.category?.name ||
          topCategoryInfo?.[0] ||
          "",
        spent: formatNumber(
          (exceededBudget || nearLimitBudget)
            ? byCategory[(exceededBudget || nearLimitBudget).category?.name] || 0
            : topCategoryInfo?.[1]
        ),
        limit: formatNumber((exceededBudget || nearLimitBudget)?.limitAmount || 0),
        percent: totalExpense && topCategoryInfo
          ? Math.round((topCategoryInfo[1] / totalExpense) * 100)
          : 0,
        month: currentMonth(),
      };

      const trigger = template.triggerType || "general";
      const matches =
        trigger === "general" ||
        (trigger === "budget_exceeded" && Boolean(exceededBudget)) ||
        (trigger === "budget_near_limit" && Boolean(nearLimitBudget)) ||
        (trigger === "high_spending" &&
          topCategoryInfo &&
          totalExpense > 0 &&
          topCategoryInfo[1] / totalExpense > 0.3) ||
        (trigger === "low_savings" && income > 0 && totalExpense > income * 0.9);

      if (!matches) continue;

      addTip({
        title: template.title,
        message: renderTemplate(template, values),
        category: template.category || null,
        potentialSavings: 0,
        priority: 3,
        source: "template",
      });
    }

    addTip({
      title: "Aim for the 50-30-20 rule",
      message:
        "Try the 50-30-20 rule: 50% for needs, 30% for wants, 20% for savings. Even small adjustments make a difference over time.",
      potentialSavings: Math.round(income * 0.05) || 500,
      priority: 3,
      source: "system",
    });
  }

  if (tips.length > 0) {
    await SavingTip.insertMany(tips);
  }

  return SavingTip.find({ user: userId, isDismissed: false }).sort({
    isPinned: -1,
    priority: -1,
    potentialSavings: -1,
  });
}

module.exports = { generateTipsForUser, impactPriority };
