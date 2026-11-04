const Transaction = require("../models/Transaction");
const Insight = require("../models/Insight");
const Category = require("../models/Category");
const SavingTip = require("../models/SavingTip");
const { currentMonth, monthRange } = require("../utils/validation");
const { generateAiInsightsAndTips } = require("./groq.service");

const FLAG_GROWTH_THRESHOLD = 20;
const FLAG_BASELINE_MONTHS = 3;

async function syncInsightTips(userId, insight) {
  const storedTips = Array.isArray(insight?.syncedTips) ? insight.syncedTips : [];
  const flaggedCategory = insight?.flaggedCategories?.[0];
  const syncedTips = storedTips.length
    ? storedTips
    : insight
      ? [{
          title: flaggedCategory?.categoryName
            ? `Review your ${flaggedCategory.categoryName} spending`
            : "Your latest spending insight",
          message: [
            flaggedCategory?.message,
            insight.spendingInsight || insight.summaryText,
            insight.recommendation || insight.tipText,
          ].filter(Boolean).join(" "),
          potentialSavings: 0,
          category: flaggedCategory?.categoryName || "",
        }]
      : [];

  await SavingTip.updateMany(
    {
      user: userId,
      source: { $in: ["insight", "ai"] },
      isDismissed: false,
      isPinned: false,
    },
    { $set: { isDismissed: true } }
  );

  if (syncedTips.length) {
    const tips = [];
    for (let index = 0; index < syncedTips.length; index += 1) {
      const tip = syncedTips[index];
      let category = null;
      if (tip.category) {
        const escapedCategory = String(tip.category).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        const categoryDoc = await Category.findOne({
          name: new RegExp(`^${escapedCategory}$`, "i"),
        }).select("_id");
        category = categoryDoc?._id || null;
      }

      tips.push({
        user: userId,
        title: String(tip.title || "Personalized saving tip").slice(0, 120),
        message: String(tip.message || "Review your recent spending and choose one area to reduce.").slice(0, 1000),
        potentialSavings: Math.max(0, Number(tip.potentialSavings) || 0),
        category,
        priority: 80 - index * 5,
        source: "insight",
        insightMonth: insight.month,
      });
    }

    await SavingTip.insertMany(tips);
  }

  return SavingTip.find({ user: userId, isDismissed: false }).sort({
    isPinned: -1,
    priority: -1,
    potentialSavings: -1,
  });
}


async function generateInsightForUser(userId, options = {}) {
  const month = options.month || currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw Object.assign(new Error("Invalid month, expected YYYY-MM"), {
      statusCode: 400,
    });
  }

  const { start, end } = monthRange(month);


  const baselineStart = new Date(start);
  baselineStart.setUTCMonth(baselineStart.getUTCMonth() - FLAG_BASELINE_MONTHS);
  const baselineEnd = new Date(start);


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


  const aiOutput = await generateAiInsightsAndTips({
    thisMonthName: monthName,
    thisMonthExpense: totalExpense,
    lastMonthExpense,
    topCategory: topCategoryName,
    topCategorySpent,
    topCategoryLastMonth,
    categoryBreakdown,
    currency: "₨ ",
  });

  const spendingInsight =
    aiOutput.spendingInsight ||
    `You spent 40% more on ${topCategoryName} this month compared to last month.`;
  const recommendation =
    aiOutput.recommendation || "Try cooking at home to save around ₨ 500!";
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


  const insight = await Insight.findOneAndUpdate(
    { user: userId, month },
    {
      user: userId,
      month,
      summaryText: spendingInsight,
      tipText: recommendation,
      spendingInsight,
      recommendation,
      currency: "PKR",
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


  await syncInsightTips(userId, insight);

  return insight;
}

module.exports = { generateInsightForUser, syncInsightTips };
