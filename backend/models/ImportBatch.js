const mongoose = require("mongoose");

const importBatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    totalRows: {
      type: Number,
      default: 0,
    },

    successfulRows: {
      type: Number,
      default: 0,
    },

    failedRows: {
      type: Number,
      default: 0,
    },

    duplicateRows: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    errors: [
      {
        row: Number,
        message: String,
      },
    ],

    // Transactions created by this batch (used by /import/batches/:id/apply-ai).
    transactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ImportBatch", importBatchSchema);