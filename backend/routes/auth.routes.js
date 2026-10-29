const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect, studentOnly } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimit.middleware");

// Sensitive auth endpoints: 10 requests/minute per client IP.
const authLimitOptions = {
  windowMs: 60 * 1000,
  max: 10,
  message:
    "Too many authentication attempts. Please try again in a minute.",
};

router.post("/register", rateLimit(authLimitOptions), authController.register);
router.post("/login", rateLimit(authLimitOptions), authController.login);
router.post("/logout", authController.logout);
router.get("/me", protect, authController.getMe);
router.get("/session", protect, authController.getSession);
router.post("/heartbeat", protect, authController.heartbeat);

router.post(
  "/forgot-password",
  rateLimit(authLimitOptions),
  authController.forgotPassword
);
router.post(
  "/reset-password/:token",
  rateLimit(authLimitOptions),
  authController.resetPassword
);
router.put("/change-password", protect, authController.changePassword);

module.exports = router;
