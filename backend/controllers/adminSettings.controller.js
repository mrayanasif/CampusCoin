const SystemSetting = require("../models/SystemSetting");

exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.find().sort({ key: 1 });
    res.json({ success: true, count: settings.length, settings });
  } catch (error) {
    next(error);
  }
};

exports.getSettingByKey = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ success: false, message: "Setting not found" });
    }
    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};


exports.upsertSetting = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: "Key required" });
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      {
        key,
        value,
        description: description || "",
        updatedBy: req.user.id,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: "Setting saved", setting });
  } catch (error) {
    next(error);
  }
};

exports.deleteSetting = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOneAndDelete({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Setting deleted" });
  } catch (error) {
    next(error);
  }
};