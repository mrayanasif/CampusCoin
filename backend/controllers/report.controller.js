const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { sendReportEmail } = require("../utils/email");
const {
  currentMonth,
  escapeRegex,
  isNonEmptyString,
  isValidMonth,
  isValidObjectId,
  monthRange,
  parseDate,
} = require("../utils/validation");

const TYPES = ["income", "expense"];
const SOURCES = ["manual", "csv", "ai", "recurring"];

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

function resolveRange(query) {
  const month = query.month || currentMonth();

  if (!isValidMonth(month)) {
    return { error: "Invalid month, expected YYYY-MM" };
  }

  const { start, end } = monthRange(month);
  return { month, start, end };
}

function resolveDateFilter(from, to) {
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

exports.categoryWise = async (req, res, next) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return invalid(res, range.error);
    const { month, start, end } = range;

    const data = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense",
          deletedAt: null,
          date: { $gte: start, $lt: end },
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
          category: { $ifNull: ["$cat.name", "Uncategorized"] },
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, month, data });
  } catch (e) {
    next(e);
  }
};

exports.incomeVsExpense = async (req, res, next) => {
  try {
    // Last six calendar months, including months with no transactions (zeros)
    // so the chart always shows a complete trend (SRS: last six months).
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1)
      );
      months.push(d.toISOString().slice(0, 7));
    }

    const start = new Date(`${months[0]}-01T00:00:00.000Z`);

    const raw = await Transaction.aggregate([
      { $match: { user: req.user._id, deletedAt: null, date: { $gte: start } } },
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

    const byMonth = {};
    for (const row of raw) {
      if (!byMonth[row._id.month]) byMonth[row._id.month] = {};
      byMonth[row._id.month][row._id.type] = row.total;
    }

    const data = [];
    for (const month of months) {
      data.push({
        _id: { month, type: "income" },
        total: byMonth[month]?.income || 0,
      });
      data.push({
        _id: { month, type: "expense" },
        total: byMonth[month]?.expense || 0,
      });
    }

    res.json({ success: true, months, data });
  } catch (e) {
    next(e);
  }
};

exports.dailySummary = async (req, res, next) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return invalid(res, range.error);
    const { month, start, end } = range;

    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, deletedAt: null, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    res.json({ success: true, month, data });
  } catch (e) {
    next(e);
  }
};

exports.weeklySummary = async (req, res, next) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return invalid(res, range.error);
    const { month, start, end } = range;

    const data = await Transaction.aggregate([
      { $match: { user: req.user._id, deletedAt: null, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            week: { $isoWeek: "$date" },
            year: { $isoWeekYear: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.week": 1 } },
    ]);

    res.json({ success: true, month, data });
  } catch (e) {
    next(e);
  }
};

exports.filteredReport = async (req, res, next) => {
  try {
    const { from, to, category, type, source, search } = req.query;
    const filter = { user: req.user.id, deletedAt: null };

    const dateRange = resolveDateFilter(from, to);
    if (dateRange.error) return invalid(res, dateRange.error);
    if (dateRange.filter) filter.date = dateRange.filter;

    if (category) {
      if (!isValidObjectId(category)) return invalid(res, "Invalid category filter");
      filter.category = category;
    }

    if (type) {
      if (!TYPES.includes(type)) return invalid(res, "Type must be income or expense");
      filter.type = type;
    }

    // "Income source" / record origin filter.
    if (source) {
      if (!SOURCES.includes(source)) {
        return invalid(res, `Source must be one of: ${SOURCES.join(", ")}`);
      }
      filter.source = source;
    }

    if (search) {
      if (typeof search !== "string") return invalid(res, "Invalid search term");
      filter.description = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    const txns = await Transaction.find(filter)
      .populate("category", "name type")
      .sort({ date: -1, createdAt: -1 });

    const income = txns
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txns
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      count: txns.length,
      transactions: txns,
      summary: { income, expense, balance: income - expense },
    });
  } catch (e) {
    next(e);
  }
};

// The report PDF/image is generated client-side (html2canvas + jsPDF in the
// React app), which keeps the API free of heavy native dependencies. These
// endpoints are intentionally not implemented server-side.
exports.exportPDF = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Server-side PDF export is not implemented. The report is exported as PDF in the browser; use the app's Export PDF button.",
  });
};

exports.exportImage = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Server-side image export is not implemented. The report is exported as PNG in the browser; use the app's Export Image button.",
  });
};

exports.shareByEmail = async (req, res, next) => {
  try {
    const { from, to, category, periodLabel } = req.body || {};

    const user = await User.findById(req.user.id).select("name email");
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    const filter = { user: req.user._id, deletedAt: null };

    const start = from
      ? parseDate(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? parseDate(to) : new Date();

    if (!start) return invalid(res, "Invalid 'from' date");
    if (!end) return invalid(res, "Invalid 'to' date");

    filter.date = { $gte: start, $lte: end };

    if (category && category !== "all") {
      if (!isValidObjectId(category)) return invalid(res, "Invalid category filter");
      filter.category = category;
    }

    const txns = await Transaction.find(filter)
      .populate("category", "name type")
      .sort({ date: -1 });

    const income = txns
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txns
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryTotals = {};
    txns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.category?.name || "Uncategorized";
        if (!categoryTotals[name]) categoryTotals[name] = 0;
        categoryTotals[name] += t.amount;
      });

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percent: expense ? Math.round((value / expense) * 100) : 0,
      }));

    const period =
      isNonEmptyString(periodLabel) && periodLabel.length <= 60
        ? periodLabel
        : from && to
          ? `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`
          : "This Month";

    await sendReportEmail(user.email, user.name, {
      summary: { income, expense, savings: income - expense },
      categoryBreakdown,
      periodLabel: period,
    });

    console.log(`📧 Report email sent to: ${user.email}`);

    res.json({
      success: true,
      message: `Report sent to ${user.email}`,
      email: user.email,
    });
  } catch (error) {
    console.error("Share by email error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    });
  }
};
