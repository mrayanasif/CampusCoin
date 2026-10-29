const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const User = require("../models/User");


exports.getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    next(error);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, type, startDate, endDate } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message required" });
    }

    const announcement = await Announcement.create({
      title,
      message,
      type: type || "general",
      createdBy: req.user.id,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    });


    const students = await User.find({ role: "student", isActive: true }).select("_id");
    const notifications = students.map((s) => ({
      user: s._id,
      title: `📢 ${title}`,
      message: message,
      type: "announcement",
      link: "/dashboard",
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: `Announcement created & sent to ${students.length} students`,
      announcement,
      notifiedCount: students.length,
    });
  } catch (error) {
    next(error);
  }
};


exports.updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Announcement updated", announcement });
  } catch (error) {
    next(error);
  }
};


exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};


exports.toggleAnnouncementActive = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.json({
      success: true,
      message: announcement.isActive ? "Activated" : "Deactivated",
      announcement,
    });
  } catch (error) {
    next(error);
  }
};