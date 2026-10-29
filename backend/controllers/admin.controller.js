const crypto = require("crypto");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendPasswordResetEmail } = require("../utils/email");

const isProduction = () => process.env.NODE_ENV === "production";

async function mostUsedCategories(limit = 5) {
  return Transaction.aggregate([
    // Soft-deleted transactions are not "used" and must not appear in stats.
    { $match: { deletedAt: null } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
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
        count: 1,
      },
    },
  ]);
}

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

async function setUserActive(req, res, next, isActive) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Administrator accounts cannot be modified here" });
    }

    user.isActive = isActive;
    await user.save();

    const sanitized = user.toObject();
    delete sanitized.password;

    res.json({
      success: true,
      message: isActive ? "User enabled" : "User disabled",
      user: sanitized,
    });
  } catch (error) {
    next(error);
  }
}

exports.disableUser = (req, res, next) => setUserActive(req, res, next, false);
exports.enableUser = (req, res, next) => setUserActive(req, res, next, true);

exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Invalidate any previously issued tokens, then create a fresh one.
    await PasswordResetToken.updateMany(
      { user: user._id, used: false },
      { used: true }
    );

    const token = crypto.randomBytes(32).toString("hex");
    await PasswordResetToken.create({
      user: user._id,
      token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, token);
      return res.json({
        success: true,
        message: `Password reset link sent to ${user.email}`,
      });
    } catch (emailError) {
      console.error("Admin reset email failed:", emailError.message);

      if (isProduction()) {
        return res.json({
          success: true,
          message: "Password reset requested, but the email could not be sent.",
        });
      }

      return res.json({
        success: true,
        message: "Email failed. Use the fallback reset link below.",
        token,
        emailError: emailError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getStatsOverview = async (req, res, next) => {
  try {
    const [activeUsers, totalUsers, totalTransactions, topCategories] =
      await Promise.all([
        User.countDocuments({ role: "student", isActive: true }),
        User.countDocuments({ role: "student" }),
        Transaction.countDocuments({ deletedAt: null }),
        mostUsedCategories(5),
      ]);

    res.json({
      success: true,
      activeUsers,
      totalUsers,
      totalTransactions,
      totalCategories: await Category.countDocuments({ isActive: true }),
      topCategory: topCategories[0]?.category || "—",
      mostUsedCategories: topCategories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsageStats = async (req, res, next) => {
  try {
    const six = new Date();
    six.setMonth(six.getMonth() - 5);
    six.setDate(1);

    const [data, topCategories] = await Promise.all([
      Transaction.aggregate([
        { $match: { deletedAt: null, date: { $gte: six } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      mostUsedCategories(5),
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const usage = data.map((d) => {
      const [, month] = d._id.split("-");
      return {
        month: monthNames[parseInt(month, 10) - 1],
        key: d._id,
        transactions: d.transactions,
      };
    });

    res.json({
      success: true,
      usage,
      mostUsedCategories: topCategories,
    });
  } catch (error) {
    next(error);
  }
};
