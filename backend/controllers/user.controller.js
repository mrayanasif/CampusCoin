
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { syncMonthlySavings } = require("./transaction.controller");
const { currentMonth, monthRange } = require("../utils/validation");

const invalid = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    let user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await syncMonthlySavings(user._id, new Date());
    const { start, end } = monthRange(currentMonth());
    const [totals, refreshedUser] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: user._id,
            deletedAt: null,
            date: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
      User.findById(user._id).select("-password"),
    ]);
    if (!refreshedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user = refreshedUser;

    const rawIncome = totals.find((item) => item._id === "income")?.total || 0;
    const expense = totals.find((item) => item._id === "expense")?.total || 0;
    const income = rawIncome > 0 ? rawIncome : Number(user.monthlyAllowance) || 0;
    const availableBalance = Math.max(0, income - expense);

    return res.json({
      success: true,
      user,
      availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const {
      name,
      academicYear,
      monthlyAllowance,
      savingsGoal,
      savings,
    } = req.body || {};

    const update = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return invalid(res, "Name must be a non-empty string");
      }

      update.name = name.trim();
    }

    if (academicYear !== undefined) {
      if (
        typeof academicYear !== "string" ||
        academicYear.trim().length > 40
      ) {
        return invalid(
          res,
          "Academic year must be a string of at most 40 characters"
        );
      }

      update.academicYear = academicYear.trim();
    }

    for (const [key, value] of Object.entries({
      monthlyAllowance,
      savingsGoal,
      savings,
    })) {
      if (value === undefined) continue;

      if (
        value === "" ||
        value === null ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      ) {
        return invalid(
          res,
          `${key} must be a non-negative number`
        );
      }

      update[key] = Number(value);
    }

    if (savings !== undefined) update.savingsConfigured = true;

    if (Object.keys(update).length === 0) {
      return invalid(res, "No valid profile fields supplied");
    }

    let user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (update.monthlyAllowance !== undefined) {
      const now = new Date();

      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const allowanceTransaction = await Transaction.findOne({
        user: user._id,
        type: "income",
        description: "Monthly allowance",
        deletedAt: null,
        date: {
          $gte: start,
          $lt: end,
        },
      }).sort({ date: -1 });

      if (allowanceTransaction) {
        allowanceTransaction.amount = user.monthlyAllowance;
        await allowanceTransaction.save();
      }

      await syncMonthlySavings(user._id, new Date());
      user = await User.findById(user._id).select("-password");
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};


exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const { darkMode, fontSize } = req.body || {};
    const update = {};

    if (darkMode !== undefined) {
      if (typeof darkMode !== "boolean") {
        return invalid(res, "darkMode must be a boolean");
      }

      update["preferences.darkMode"] = darkMode;
    }

    if (fontSize !== undefined) {
      if (!["small", "normal", "large"].includes(fontSize)) {
        return invalid(
          res,
          "fontSize must be one of: small, normal, large"
        );
      }

      update["preferences.fontSize"] = fontSize;
    }

    if (Object.keys(update).length === 0) {
      return invalid(res, "No valid preference fields supplied");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Preferences updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { profileImage } = req.body || {};

    if (typeof profileImage !== "string") {
      return invalid(res, "profileImage must be a string URL");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { profileImage } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Image updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};


exports.deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};
