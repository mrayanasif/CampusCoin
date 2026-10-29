const Transaction = require("../models/Transaction");
const Insight = require("../models/Insight");
const Category = require("../models/Category");
const { currentMonth, monthRange } = require("../utils/validation");

const FLAG_GROWTH_THRESHOLD = 20;
const FLAG_BASELINE_MONTHS = 3;

/**
 * Generate (and upsert) the AI-style monthly narrative insight for a user.
 * - plain-language summary of the month;
 * - categories growing above the student's own recent trend are flagged;
 * - one actionable advice string;
 * - stored in Insight history (one document per user/month).
 */
async function generateInsightForUser(userId, options = {}) {
  const month = options.month || currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw Object.assign(new Error("Invalid month, expected YYYY-MM"), {
      statusCode: 400,
    });
  }

  const { start, end } = monthRange(month);

  // Baseline: the 3 months before the selected month (the student's own trend).
  const baselineStart = new Date(start);
  baselineStart.setUTCMonth(baselineStart.getUTCMonth() - FLAG_BASELINE_MONTHS);
  const baselineEnd = new Date(start);

  const [current, baseline] = await Promise.all([
    Transaction.find({
      user: userId,
      deletedAt: null,
      date: { $gte: start, $lt: end },
    }).populate("category", "name type"),
    Transaction.find({
      user: userId,
      deletedAt: null,
      date: { $gte: baselineStart, $lt: baselineEnd },
      type: "expense",
    }).populate("category", "name type"),
  ]);

  if (current.length === 0) {
    await Insight.findOneAndDelete({ user: userId, month });
    return null;
  }

  const sum = (rows, type) =>
    rows.filter((t) => t.type === type).reduce((total, t) => total + t.amount, 0);

  const totalIncome = sum(current, "income");
  const totalExpense = sum(current, "expense");

  const byCategory = (rows) => {
    const map = {};
    rows
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.category?.name || "Uncategorized";
        if (!map[name]) map[name] = { total: 0, categoryId: t.category?._id || null };
        map[name].total += t.amount;
      });
    return map;
  };

  const currentByCategory = byCategory(current);
  const baselineByCategory = byCategory(baseline);

  const sortedCategories = Object.entries(currentByCategory).sort(
    (a, b) => b[1].total - a[1].total
  );
  const topCategory = sortedCategories[0];

  const monthName = new Date(`${month}-01T00:00:00.000Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const summaryParts = [
    `In ${monthName}, you spent ₹${totalExpense.toLocaleString()} and earned ₹${totalIncome.toLocaleString()}.`,
  ];

  if (topCategory) {
    const percentage = totalExpense
      ? Math.round((topCategory[1].total / totalExpense) * 100)
      : 0;
    summaryParts.push(
      `${topCategory[0]} was your biggest expense at ₹${topCategory[1].total.toLocaleString()} (${percentage}% of total).`
    );
  }

  const flaggedCategories = [];
  for (const [name, info] of Object.entries(currentByCategory)) {
    // Monthly average over the baseline window (only months with data so a
    // single quiet month doesn't inflate growth percentages).
    const baselineMonths = new Set();
    baseline
      .filter((t) => (t.category?.name || "Uncategorized") === name)
      .forEach((t) => baselineMonths.add(String(t.date).slice(0, 7)));

    const baselineTotal = baselineByCategory[name]?.total || 0;
    const baselineAverage = baselineTotal / FLAG_BASELINE_MONTHS;

    if (baselineAverage > 0) {
      const growth = ((info.total - baselineAverage) / baselineAverage) * 100;
      if (growth >= FLAG_GROWTH_THRESHOLD) {
        flaggedCategories.push({
          categoryId: info.categoryId,
          categoryName: name,
          growthPercentage: Math.round(growth),
          message: `${name} spending rose ${Math.round(growth)}% compared to your recent average (₹${Math.round(baselineAverage).toLocaleString()}/month).`,
        });
      }
    } else if (info.total > 1000) {
      flaggedCategories.push({
        categoryId: info.categoryId,
        categoryName: name,
        growthPercentage: 100,
        message: `You started spending on ${name} this month (₹${info.total.toLocaleString()}).`,
      });
    }
  }

  flaggedCategories.sort((a, b) => b.growthPercentage - a.growthPercentage);

  // Resolve category ids so clients can link to a category page.
  for (const flag of flaggedCategories) {
    if (!flag.categoryId) {
      const category = await Category.findOne({ name: flag.categoryName }).select("_id");
      flag.categoryId = category?._id || null;
    }
  }

  let tipText;
  if (flaggedCategories.length > 0) {
    const top = flaggedCategories[0];
    tipText = `Try setting a weekly limit for ${top.categoryName} this month to slow the increase.`;
  } else if (topCategory) {
    tipText =
      "You're spending consistently. Consider increasing your savings goal by ₹500 this month.";
  } else {
    tipText = "Keep tracking your expenses regularly to spot patterns early.";
  }

  const insight = await Insight.findOneAndUpdate(
    { user: userId, month },
    {
      user: userId,
      month,
      summaryText: summaryParts.join(" "),
      tipText,
      flaggedCategories: flaggedCategories.map((flag) => ({
        category: flag.categoryId,
        categoryName: flag.categoryName,
        growthPercentage: flag.growthPercentage,
        message: flag.message,
      })),
      generatedBy: "system",
      generatedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

  return insight;
}

module.exports = { generateInsightForUser };
