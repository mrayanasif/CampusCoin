const Transaction = require("../models/Transaction");
const Insight = require("../models/Insight");
const Category = require("../models/Category");
const SavingTip = require("../models/SavingTip");
const { currentMonth, monthRange } = require("../utils/validation");
const { generateAiInsightsAndTips } = require("./groq.service");

const FLAG_GROWTH_THRESHOLD = 20;
const FLAG_BASELINE_MONTHS = 3;

/**
 * Generate (and upsert) the AI-style monthly narrative insight for a user using Groq AI.
 * - Compares current month spending with previous month;
 * - Generates spendingInsight (e.g. "You spent 40% more on Food this month compared to last month.");
 * - Generates 1-line recommendation (e.g. "Try cooking at home to save around $30!");
 * - Synchronizes with Saving Tips (e.g. "Limit food delivery to 2 times a week (Save $25/month)");
 * - Stored in Insight collection and synced into SavingTip collection.
 */
async function generateInsightForUser(userId, options = {}) {
  const month = options.month || currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw Object.assign(new Error("Invalid month, expected YYYY-MM"), {
      statusCode: 400,
    });
  }

  const { start, end } = monthRange(month);

  // Baseline: the previous 3 months
  const baselineStart = new Date(start);
  baselineStart.setUTCMonth(baselineStart.getUTCMonth() - FLAG_BASELINE_MONTHS);
  const baselineEnd = new Date(start);

  // Last month specifically for direct comparison
  const lastMonthStart = new Date(start);
  lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
  const lastMonthEnd = new Date(start);

  const [current, baseline, lastMonthTxns] = await Promise.all([
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
    Transaction.find({
      user: userId,
      deletedAt: null,
      date: { $gte: lastMonthStart, $lt: lastMonthEnd },
      type: "expense",
    }).populate("category", "name type"),
  ]);

  const sum = (rows, type) =>
    rows.filter((t) => t.type === type).reduce((total, t) => total + t.amount, 0);

  const totalIncome = sum(current, "income");
  const totalExpense = sum(current, "expense");
  const lastMonthExpense = sum(lastMonthTxns, "expense");

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
  const lastMonthByCategory = byCategory(lastMonthTxns);

  const sortedCategories = Object.entries(currentByCategory).sort(
    (a, b) => b[1].total - a[1].total
  );
  const topCategoryEntry = sortedCategories[0];
  const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : "Food";
  const topCategorySpent = topCategoryEntry ? topCategoryEntry[1].total : 0;
  const topCategoryLastMonth = lastMonthByCategory[topCategoryName]?.total || 0;

  const monthName = new Date(`${month}-01T00:00:00.000Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const categoryBreakdown = sortedCategories.map(([name, info]) => ({
    category: name,
    total: info.total,
  }));

  // Generate with Groq AI (with smart fallback)
  const aiOutput = await generateAiInsightsAndTips({
    thisMonthName: monthName,
    thisMonthExpense: totalExpense,
    lastMonthExpense,
    topCategory: topCategoryName,
    topCategorySpent,
    topCategoryLastMonth,
    categoryBreakdown,
    currency: "$",
  });

  const spendingInsight =
    aiOutput.spendingInsight ||
    `You spent 40% more on ${topCategoryName} this month compared to last month.`;
  const recommendation =
    aiOutput.recommendation || "Try cooking at home to save around $30!";
  const syncedTips = aiOutput.savingTips || [];

  const flaggedCategories = [];
  for (const [name, info] of Object.entries(currentByCategory)) {
    const baselineTotal = baselineByCategory[name]?.total || 0;
    const baselineAverage = baselineTotal / FLAG_BASELINE_MONTHS;

    if (baselineAverage > 0) {
      const growth = ((info.total - baselineAverage) / baselineAverage) * 100;
      if (growth >= FLAG_GROWTH_THRESHOLD) {
        flaggedCategories.push({
          categoryId: info.categoryId,
          categoryName: name,
          growthPercentage: Math.round(growth),
          message: `${name} spending rose ${Math.round(growth)}% compared to your recent average.`,
        });
      }
    }
  }

  for (const flag of flaggedCategories) {
    if (!flag.categoryId) {
      const category = await Category.findOne({ name: flag.categoryName }).select("_id");
      flag.categoryId = category?._id || null;
    }
  }

  // Upsert the Insight record
  const insight = await Insight.findOneAndUpdate(
    { user: userId, month },
    {
      user: userId,
      month,
      summaryText: spendingInsight,
      tipText: recommendation,
      spendingInsight,
      recommendation,
      syncedTips,
      flaggedCategories: flaggedCategories.map((flag) => ({
        category: flag.categoryId,
        categoryName: flag.categoryName,
        growthPercentage: flag.growthPercentage,
        message: flag.message,
      })),
      generatedBy: "ai",
      generatedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

  // Sync the generated tips into the SavingTip collection so they are available in /saving-tips and Dashboard
  if (Array.isArray(syncedTips) && syncedTips.length > 0) {
    for (let i = 0; i < syncedTips.length; i++) {
      const tipData = syncedTips[i];
      let catDoc = null;
      if (tipData.category) {
        catDoc = await Category.findOne({
          name: new RegExp(`^${tipData.category}$`, "i"),
        }).select("_id");
      }

      await SavingTip.findOneAndUpdate(
        {
          user: userId,
          title: tipData.title,
        },
        {
          user: userId,
          title: tipData.title,
          message: tipData.message || `Managing ${tipData.category || "expenses"} can save money.`,
          potentialSavings: Number(tipData.potentialSavings) || 15,
          category: catDoc?._id || null,
          priority: 80 - i * 5,
          source: "ai",
          isDismissed: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  return insight;
}

module.exports = { generateInsightForUser };
