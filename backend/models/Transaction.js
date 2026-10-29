const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    aiSuggestedCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    aiSuggestionAccepted: {
      type: Boolean,
      default: false,
    },

    source: {
      type: String,
      enum: ["manual", "csv", "ai", "recurring", "allowance"],
      default: "manual",
    },

    // Set when the transaction is materialised from a recurring template.
    recurringTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
      default: null,
    },

    recurringOccurrence: {
      type: Date,
      default: null,
    },

    // Set when the transaction was created by a CSV import batch.
    importBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      default: null,
    },
    // Soft delete: keeps the full transaction history (SRS "retaining the full
    // history"). Every normal read must filter `deletedAt: null`.
    deletedAt: {
      type: Date,
      default: null,
    },

    // Set if an expense exceeded its budget and excess was deducted from savings
    deductedFromSavings: {
      type: Boolean,
      default: false,
    },

    savingsDeductedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Supports paginated history and monthly aggregations per user.
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, deletedAt: 1, date: -1 });
transactionSchema.index({ user: 1, recurringTransaction: 1, recurringOccurrence: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
