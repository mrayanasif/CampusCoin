const mongoose = require("mongoose");

const tipTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    triggerType: {
      type: String,
      enum: [
        "high_spending",
        "budget_near_limit",
        "budget_exceeded",
        "low_savings",
        "general",
      ],
      default: "general",
    },

    threshold: {
      type: Number,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TipTemplate", tipTemplateSchema);