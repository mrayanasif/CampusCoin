const Recurring = require("../models/RecurringTransaction");
const { processDueRecurringForUser } = require("../services/recurring.service");
const { getAccessibleCategory } = require("../utils/categoryAccess");
const { isValidObjectId, parseDate } = require("../utils/validation");

const FREQUENCIES = ["weekly", "monthly", "yearly"];

const updatableFields = [
  "category",
  "type",
  "amount",
  "description",
  "frequency",
  "startDate",
  "nextOccurrence",
  "endDate",
  "isActive",
];

function normalizePayload(body, { partial = false } = {}) {
  const payload = {};
  const errors = [];

  if (body.category !== undefined) payload.category = body.category;
  else if (!partial) errors.push("Category is required");

  if (body.type !== undefined) {
    if (!["income", "expense"].includes(body.type)) {
      errors.push("Type must be income or expense");
    } else {
      payload.type = body.type;
    }
  } else if (!partial) {
    errors.push("Type is required");
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push("Amount must be a number greater than zero");
    } else {
      payload.amount = amount;
    }
  } else if (!partial) {
    errors.push("Amount is required");
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") errors.push("Description must be a string");
    else payload.description = body.description.trim();
  }

  if (body.frequency !== undefined) {
    if (!FREQUENCIES.includes(body.frequency)) {
      errors.push("Frequency must be weekly, monthly or yearly");
    } else {
      payload.frequency = body.frequency;
    }
  } else if (!partial) {
    errors.push("Frequency is required");
  }

  if (body.startDate !== undefined) {
    const startDate = parseDate(body.startDate);
    if (!startDate) errors.push("Invalid start date");
    else payload.startDate = startDate;
  } else if (!partial) {
    errors.push("Start date is required");
  }

  if (body.nextOccurrence !== undefined) {
    const nextOccurrence = parseDate(body.nextOccurrence);
    if (!nextOccurrence) errors.push("Invalid next occurrence date");
    else payload.nextOccurrence = nextOccurrence;
  }

  if (body.endDate !== undefined && body.endDate !== null && body.endDate !== "") {
    const endDate = parseDate(body.endDate);
    if (!endDate) errors.push("Invalid end date");
    else payload.endDate = endDate;
  } else if (body.endDate === null || body.endDate === "") {
    payload.endDate = null;
  }

  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);

  return { payload, errors };
}

exports.getAll = async (req, res, next) => {
  try {
    // Materialise any due occurrences so the history/reports stay correct even
    // without a background scheduler (safe to call repeatedly - it is idempotent).
    let processed = null;
    try {
      processed = await processDueRecurringForUser(req.user.id);
    } catch (error) {
      console.error("Recurring processing error:", error.message);
    }

    const items = await Recurring.find({ user: req.user.id }).populate(
      "category",
      "name type"
    );

    res.json({
      success: true,
      count: items.length,
      items,
      createdTransactions: processed ? processed.createdTransactions : 0,
    });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { payload, errors } = normalizePayload(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const { category, error } = await getAccessibleCategory(
      req.user.id,
      payload.category,
      payload.type
    );
    if (error) return res.status(400).json({ success: false, message: error });

    payload.category = category._id;
    if (!payload.nextOccurrence) payload.nextOccurrence = payload.startDate;

    if (
      payload.endDate &&
      payload.endDate.getTime() < payload.startDate.getTime()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "End date cannot be before start date" });
    }

    const item = await Recurring.create({ ...payload, user: req.user.id });
    res.status(201).json({ success: true, message: "Recurring created", item });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { payload, errors } = normalizePayload(req.body || {}, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const existing = await Recurring.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (payload.category !== undefined || payload.type !== undefined) {
      const nextType = payload.type || existing.type;
      const nextCategoryId = payload.category || existing.category;
      const { category, error } = await getAccessibleCategory(
        req.user.id,
        nextCategoryId,
        nextType
      );
      if (error) return res.status(400).json({ success: false, message: error });
      payload.category = category._id;
    }

    // Never let the client move a record to another user.
    for (const field of updatableFields) {
      if (payload[field] !== undefined) existing[field] = payload[field];
    }

    await existing.save();
    res.json({ success: true, message: "Updated", item: existing });
  } catch (e) {
    next(e);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const item = await Recurring.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    item.isActive = !item.isActive;

    // Re-activating: if the next occurrence is stale, bring it up to date so a
    // flood of back-dated transactions is not generated.
    if (item.isActive && item.nextOccurrence < new Date()) {
      item.nextOccurrence = new Date();
    }

    await item.save();
    res.json({ success: true, message: "Toggled", item });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const item = await Recurring.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

exports.processDue = async (req, res, next) => {
  try {
    const result = await processDueRecurringForUser(req.user.id);
    res.json({
      success: true,
      message:
        result.createdTransactions > 0
          ? `${result.createdTransactions} recurring transaction(s) added`
          : "No recurring transactions were due",
      processed: result.createdTransactions,
      processedItems: result.processedItems,
      transactions: result.created,
    });
  } catch (e) {
    next(e);
  }
};
