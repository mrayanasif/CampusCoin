const ImportBatch = require("../models/ImportBatch");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const { suggestCategoryForDescription } = require("../services/ai.service");
const { escapeRegex, isValidObjectId, parseDate } = require("../utils/validation");

const MAX_ROWS = 1000;
const MAX_ERRORS_KEPT = 100;

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

function normalizeType(value) {
  const type = String(value || "expense").toLowerCase().trim();
  return ["income", "expense"].includes(type) ? type : null;
}

async function findCategoryForRow(userId, name, type) {
  if (typeof name !== "string" || !name.trim()) return null;
  const exact = new RegExp(`^${escapeRegex(name.trim())}$`, "i");

  return (
    (await Category.findOne({
      name: exact,
      isDefault: true,
      isActive: true,
      type,
    })) ||
    (await Category.findOne({
      name: exact,
      createdBy: userId,
      isActive: true,
      type,
    })) ||
    (await Category.findOne({ name: exact, isDefault: true, type }))
  );
}

exports.uploadCSV = async (req, res, next) => {
  try {
    const { fileName, rows } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return invalid(res, "rows must be a non-empty array of CSV records");
    }
    if (rows.length > MAX_ROWS) {
      return invalid(res, `Cannot import more than ${MAX_ROWS} rows at once`);
    }

    const batch = await ImportBatch.create({
      user: req.user.id,
      fileName:
        typeof fileName === "string" && fileName.trim()
          ? fileName.trim().slice(0, 200)
          : "import.csv",
      totalRows: rows.length,
      status: "processing",
    });

    let success = 0;
    let failed = 0;
    let duplicates = 0;
    const errors = [];
    const transactionIds = [];
    const seenKeys = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const rowNumber = i + 1;

      try {
        const amount = Number(row.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Amount must be a number greater than zero");
        }

        const type = normalizeType(row.type);
        if (!type) throw new Error("Type must be income or expense");

        const date = row.date ? parseDate(row.date) : new Date();
        if (!date) throw new Error("Invalid date");

        const category = await findCategoryForRow(req.user.id, row.category, type);
        if (!category) {
          throw new Error(
            `Category not found for type ${type}: ${row.category || "(empty)"}`
          );
        }

        const description =
          typeof row.description === "string" ? row.description.trim().slice(0, 500) : "";

        const duplicateKey = [
          type,
          category._id.toString(),
          amount,
          date.toISOString().slice(0, 10),
          description.toLowerCase(),
        ].join("|");

        if (seenKeys.has(duplicateKey)) {
          duplicates += 1;
          continue;
        }
        seenKeys.add(duplicateKey);

        const existing = await Transaction.findOne({
          user: req.user.id,
          type,
          category: category._id,
          amount,
          description,
          deletedAt: null,
          date: {
            $gte: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
            $lt: new Date(
              new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`).getTime() +
                24 * 60 * 60 * 1000
            ),
          },
        });

        if (existing) {
          duplicates += 1;
          continue;
        }

        const transaction = await Transaction.create({
          user: req.user.id,
          category: category._id,
          amount,
          type,
          description,
          date,
          source: "csv",
          importBatch: batch._id,
        });

        transactionIds.push(transaction._id);
        success += 1;
      } catch (err) {
        failed += 1;
        if (errors.length < MAX_ERRORS_KEPT) {
          errors.push({ row: rowNumber, message: err.message });
        }
      }
    }

    batch.successfulRows = success;
    batch.failedRows = failed;
    batch.duplicateRows = duplicates;
    batch.transactionIds = transactionIds;
    batch.status = "completed";
    batch.errors = errors;
    await batch.save();

    res.status(201).json({
      success: true,
      message: `Imported ${success}, skipped ${duplicates} duplicate(s), failed ${failed}`,
      batch,
    });
  } catch (error) {
    next(error);
  }
};

exports.preview = async (req, res, next) => {
  try {
    const { rows } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return invalid(res, "rows must be a non-empty array of CSV records");
    }

    const limited = rows.slice(0, 100);
    const suggestions = [];

    for (let i = 0; i < limited.length; i++) {
      const row = limited[i] || {};
      const description =
        typeof row.description === "string" ? row.description.trim() : "";
      const type = normalizeType(row.type) || undefined;

      const result = await suggestCategoryForDescription(req.user.id, description, {
        type,
      });

      suggestions.push({
        row: i + 1,
        description,
        suggestedCategory: result.category
          ? { id: result.category._id, name: result.category.name }
          : null,
        confidence: Number((result.confidence || 0).toFixed(2)),
        learned: Boolean(result.learned),
      });
    }

    res.json({ success: true, count: suggestions.length, suggestions });
  } catch (error) {
    next(error);
  }
};

exports.getBatches = async (req, res, next) => {
  try {
    const batches = await ImportBatch.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, batches });
  } catch (error) {
    next(error);
  }
};

exports.getBatch = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const batch = await ImportBatch.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!batch) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, batch });
  } catch (error) {
    next(error);
  }
};

exports.applyAI = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const batch = await ImportBatch.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });

    const transactions = await Transaction.find({
      user: req.user.id,
      importBatch: batch._id,
      deletedAt: null,
    }).populate("category", "name type");

    const apply = Boolean((req.body || {}).apply);
    const suggestions = [];
    let applied = 0;

    for (const transaction of transactions) {
      const suggestion = await suggestCategoryForDescription(
        req.user.id,
        transaction.description,
        { type: transaction.type }
      );

      if (!suggestion.category) continue;

      const sameAsCurrent =
        String(suggestion.category._id) === String(transaction.category?._id);

      transaction.aiSuggestedCategory = suggestion.category._id;
      if (apply && !sameAsCurrent) {
        transaction.category = suggestion.category._id;
        transaction.aiSuggestionAccepted = true;
        applied += 1;
        await transaction.save();
      } else {
        await transaction.save();
      }

      suggestions.push({
        transactionId: transaction._id,
        row: batch.transactionIds?.findIndex(
          (id) => String(id) === String(transaction._id)
        ) + 1 || null,
        description: transaction.description,
        suggestedCategory: {
          id: suggestion.category._id,
          name: suggestion.category.name,
        },
        confidence: Number((suggestion.confidence || 0).toFixed(2)),
        learned: Boolean(suggestion.learned),
        applied: apply && !sameAsCurrent,
      });
    }

    res.json({
      success: true,
      message:
        suggestions.length > 0
          ? `Generated ${suggestions.length} category suggestion(s)${apply ? `, applied ${applied}` : ""}`
          : "No AI suggestions were available for this batch",
      count: suggestions.length,
      applied,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
};
