const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    month: {
      type: String,
      required: true,
      // Example: "2026-09"
    },

    limitAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    alertPercentage: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Budget", budgetSchema);