const Category = require("../models/Category");

exports.getAllDefaultCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isDefault: true }).sort({ type: 1, name: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

exports.createDefaultCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: "Name and type required" });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be income or expense" });
    }

    const exists = await Category.findOne({ name, isDefault: true });
    if (exists) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      type,
      icon: icon || "📦",
      isDefault: true,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, message: "Category created", category });
  } catch (error) {
    next(error);
  }
};


exports.updateDefaultCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { name, type, icon, isActive } = req.body;

    if (name) category.name = name;
    if (type && ["income", "expense"].includes(type)) category.type = type;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json({ success: true, message: "Category updated", category });
  } catch (error) {
    next(error);
  }
};


exports.deleteDefaultCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDefault: true });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};


exports.toggleCategoryActive = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
      success: true,
      message: category.isActive ? "Category activated" : "Category deactivated",
      category,
    });
  } catch (error) {
    next(error);
  }
};