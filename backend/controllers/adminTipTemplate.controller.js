const TipTemplate = require("../models/TipTemplate");

exports.getAllTemplates = async (req, res, next) => {
  try {
    const templates = await TipTemplate.find()
      .populate("category", "name type")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: templates.length, templates });
  } catch (error) { next(error); }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const template = await TipTemplate.findById(req.params.id).populate("category", "name");
    if (!template) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, template });
  } catch (error) { next(error); }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const { title, message, category, triggerType, threshold } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "Title and message required" });

    const template = await TipTemplate.create({
      title, message,
      category: category || null,
      triggerType: triggerType || "general",
      threshold: threshold || null,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, message: "Template created", template });
  } catch (error) { next(error); }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await TipTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, message: "Template updated", template });
  } catch (error) { next(error); }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await TipTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, message: "Template deleted" });
  } catch (error) { next(error); }
};

exports.toggleTemplateActive = async (req, res, next) => {
  try {
    const template = await TipTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: "Template not found" });
    template.isActive = !template.isActive;
    await template.save();
    res.json({ success: true, message: template.isActive ? "Activated" : "Deactivated", template });
  } catch (error) { next(error); }
};