const mongoose = require("mongoose");

const savingTipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

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

    potentialSavings: {
      type: Number,
      default: 0,
    },

    priority: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      enum: ["system", "ai", "template"],
      default: "system",
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    isDismissed: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SavingTip", savingTipSchema);