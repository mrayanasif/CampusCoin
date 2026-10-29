const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    academicYear: {
      type: String,
      default: "",
    },

    monthlyAllowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    savingsGoal: {
      type: Number,
      default: 0,
      min: 0,
    },

    savings: {
      type: Number,
      default: 0,
      min: 0,
    },

    profileImage: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Accessibility preferences (SRS 1.6 "Accessibility and UI Enhancements").
    preferences: {
      darkMode: {
        type: Boolean,
        default: false,
      },

      fontSize: {
        type: String,
        enum: ["small", "normal", "large"],
        default: "normal",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);