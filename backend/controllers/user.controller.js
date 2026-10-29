
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const invalid = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

// Get the authenticated user's profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update profile and synchronize this month's allowance
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const {
      name,
      academicYear,
      monthlyAllowance,
      savingsGoal,
    } = req.body || {};

    const update = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return invalid(res, "Name must be a non-empty string");
      }

      update.name = name.trim();
    }

    // Validate academic year
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

    // Validate numeric profile fields
    for (const [key, value] of Object.entries({
      monthlyAllowance,
      savingsGoal,
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

    if (Object.keys(update).length === 0) {
      return invalid(res, "No valid profile fields supplied");
    }

    // Save profile changes in MongoDB
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

    // If monthly allowance changed, synchronize this month's
    // existing allowance transaction with the new profile value.
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
        // Update the existing transaction instead of creating
        // a duplicate allowance entry.
        allowanceTransaction.amount = user.monthlyAllowance;
        await allowanceTransaction.save();
      }
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

// Update user preferences
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

// Update profile image
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

// Deactivate account
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
