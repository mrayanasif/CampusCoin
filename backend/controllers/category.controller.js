const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { escapeRegex, isNonEmptyString } = require("../utils/validation");

const TYPES = ["income", "expense"];

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [{ isDefault: true }, { createdBy: req.user.id }],
      isActive: true,
    });
    res.json({ success: true, count: categories.length, categories });
  } catch (e) {
    next(e);
  }
};

exports.getCategoriesByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!TYPES.includes(type)) {
      return invalid(res, "Type must be income or expense");
    }

    const categories = await Category.find({
      type,
      $or: [{ isDefault: true }, { createdBy: req.user.id }],
      isActive: true,
    });
    res.json({ success: true, count: categories.length, categories });
  } catch (e) {
    next(e);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    if (!require("mongoose").Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const isOwned =
      category.isDefault || String(category.createdBy) === String(req.user.id);
    if (!isOwned) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, category });
  } catch (e) {
    next(e);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body || {};

    if (!isNonEmptyString(name)) return invalid(res, "Category name is required");
    if (!TYPES.includes(type)) return invalid(res, "Type must be income or expense");

    const trimmedName = name.trim();

    const duplicate = await Category.findOne({
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
      type,
      $or: [{ isDefault: true }, { createdBy: req.user.id }],
      isActive: true,
    });
    if (duplicate) {
      return invalid(res, `A ${type} category named "${trimmedName}" already exists`);
    }

    const category = await Category.create({
      name: trimmedName,
      type,
      icon: typeof icon === "string" ? icon : "",
      isDefault: false,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, message: "Category created", category });
  } catch (e) {
    next(e);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    if (category.isDefault) {
      return res.status(403).json({ success: false, message: "Cannot edit default" });
    }
    if (String(category.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const body = req.body || {};
    const update = {};

    if (body.name !== undefined) {
      if (!isNonEmptyString(body.name)) return invalid(res, "Category name is required");
      update.name = body.name.trim();
    }

    if (body.icon !== undefined) {
      if (typeof body.icon !== "string") return invalid(res, "Icon must be a string");
      update.icon = body.icon;
    }

    if (body.type !== undefined) {
      if (!TYPES.includes(body.type)) return invalid(res, "Type must be income or expense");
      if (body.type !== category.type) {
        // Intentionally counts soft-deleted transactions too: retained (deleted)
        // history still references this category, so its type/label must stay.
        const [transactionCount, budgetCount] = await Promise.all([
          Transaction.countDocuments({ category: category._id }),
          Budget.countDocuments({ category: category._id }),
        ]);
        if (transactionCount > 0 || budgetCount > 0) {
          return invalid(
            res,
            "Cannot change the type of a category that already has transactions or budgets"
          );
        }
        update.type = body.type;
      }
    }

    // Note: isDefault / createdBy are intentionally not client-writable.
    const updated = await Category.findByIdAndUpdate(
      category._id,
      update,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Updated", category: updated });
  } catch (e) {
    next(e);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    if (category.isDefault) {
      return res.status(403).json({ success: false, message: "Cannot delete default" });
    }
    if (String(category.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    // Intentionally counts soft-deleted transactions too, so retained history
    // never ends up pointing at a removed category.
    const [transactionCount, budgetCount] = await Promise.all([
      Transaction.countDocuments({ category: category._id }),
      Budget.countDocuments({ category: category._id }),
    ]);

    if (transactionCount > 0 || budgetCount > 0) {
      return invalid(
        res,
        "This category is in use by transactions or budgets. Reassign or remove them first."
      );
    }

    await Category.findByIdAndDelete(category._id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};
