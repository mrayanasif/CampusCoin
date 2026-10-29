const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const adminCategoryController = require("../controllers/adminCategory.controller");
const adminTipTemplateController = require("../controllers/adminTipTemplate.controller");
const adminAnnouncementController = require("../controllers/adminAnnouncement.controller");
const adminSettingsController = require("../controllers/adminSettings.controller");
const { protect, adminOnly } = require("../middleware/auth.middleware");


router.use(protect, adminOnly);


router.get("/users", adminController.getAllUsers);
router.put("/users/:id/disable", adminController.disableUser);
router.put("/users/:id/enable", adminController.enableUser);
router.put("/users/:id/reset-password", adminController.resetUserPassword);


router.get("/stats/overview", adminController.getStatsOverview);
router.get("/stats/usage", adminController.getUsageStats);


router.get("/categories", adminCategoryController.getAllDefaultCategories);
router.post("/categories", adminCategoryController.createDefaultCategory);
router.put("/categories/:id", adminCategoryController.updateDefaultCategory);
router.put("/categories/:id/toggle", adminCategoryController.toggleCategoryActive);
router.delete("/categories/:id", adminCategoryController.deleteDefaultCategory);


router.get("/tip-templates", adminTipTemplateController.getAllTemplates);
router.get("/tip-templates/:id", adminTipTemplateController.getTemplate);
router.post("/tip-templates", adminTipTemplateController.createTemplate);
router.put("/tip-templates/:id", adminTipTemplateController.updateTemplate);
router.put("/tip-templates/:id/toggle", adminTipTemplateController.toggleTemplateActive);
router.delete("/tip-templates/:id", adminTipTemplateController.deleteTemplate);


router.get("/announcements", adminAnnouncementController.getAllAnnouncements);
router.post("/announcements", adminAnnouncementController.createAnnouncement);
router.put("/announcements/:id", adminAnnouncementController.updateAnnouncement);
router.put("/announcements/:id/toggle", adminAnnouncementController.toggleAnnouncementActive);
router.delete("/announcements/:id", adminAnnouncementController.deleteAnnouncement);

router.get("/settings", adminSettingsController.getAllSettings);
router.get("/settings/:key", adminSettingsController.getSettingByKey);
router.post("/settings", adminSettingsController.upsertSetting);
router.delete("/settings/:key", adminSettingsController.deleteSetting);

module.exports = router;