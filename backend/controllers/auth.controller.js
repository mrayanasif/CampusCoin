const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PasswordResetToken = require("../models/PasswordResetToken");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/email");
const { getJwtExpire, getJwtSecret } = require("../utils/jwt");

const isProduction = () => process.env.NODE_ENV === "production";
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const generateToken = (id, role, tokenVersion = 0) =>
  jwt.sign({ id, role, tokenVersion }, getJwtSecret(), {
    expiresIn: getJwtExpire(),
  });

const authCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

const setAuthCookie = (res, token) => {
  const decoded = jwt.decode(token);
  const maxAge = decoded?.exp ? Math.max(0, decoded.exp * 1000 - Date.now()) : undefined;
  res.cookie("token", token, authCookieOptions(maxAge));
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  academicYear: user.academicYear || "",
  monthlyAllowance: user.monthlyAllowance || 0,
  savingsGoal: user.savingsGoal || 0,
  preferences: user.preferences || { darkMode: false, fontSize: "normal" },
});

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, academicYear, monthlyAllowance, savingsGoal } =
      req.body || {};

    if (typeof name !== "string" || !name.trim()) {
      return invalid(res, "Valid name is required");
    }
    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      return invalid(res, "Valid email is required");
    }
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return invalid(
        res,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return invalid(res, "Email already registered");

    const numericAllowance = max(monthlyAllowance);
    const numericGoal = max(savingsGoal);

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      academicYear: typeof academicYear === "string" ? academicYear.trim() : "",
      monthlyAllowance: numericAllowance,
      savingsGoal: numericGoal,
    });

    // ── Seed an income transaction from the allowance on registration ───
    // Wrapped in try/catch so a transaction failure never blocks signup.
    if (numericAllowance > 0) {
      try {
        // category field requires an ObjectId — look up or auto-create the "Allowance" category.
        let allowanceCat = await Category.findOne({ name: "Allowance", type: "income" });
        if (!allowanceCat) {
          allowanceCat = await Category.create({
            name: "Allowance",
            type: "income",
            icon: "💰",
            isDefault: true,
          });
        }
        await Transaction.create({
          user: user._id,
          type: "income",
          category: allowanceCat._id,
          description: "Monthly allowance",
          amount: numericAllowance,
          date: new Date(),
          source: "manual",
        });
      } catch (txError) {
        console.error("Failed to seed allowance transaction:", txError.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token);
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

function max(value) {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return invalid(res, "Valid email is required");
    }
    if (typeof password !== "string" || !password) {
      return invalid(res, "Password is required");
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user._id, user.role, user.tokenVersion || 0);
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, {
            $inc: { tokenVersion: 1 },
            lastActive: new Date(),
          });
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Logout token invalidation:", err.message);
  }
  res.clearCookie("token", authCookieOptions());
  res.json({ success: true, message: "Logged out successfully" });
};

exports.heartbeat = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    res.json({ success: true, message: "Session extended", lastActive: Date.now() });
  } catch (error) {
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Session invalid" });
    }
    res.json({
      success: true,
      active: true,
      user: publicUser(user),
      lastActive: user.lastActive,
      serverTime: Date.now(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: publicUser(user) }); // ← use publicUser for shape parity
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return invalid(res, "Valid email is required");
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    const genericResponse = {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };

    if (!user || !user.isActive) return res.json(genericResponse);

    await PasswordResetToken.updateMany(
      { user: user._id, used: false },
      { used: true }
    );

    const token = crypto.randomBytes(32).toString("hex");
    await PasswordResetToken.create({
      user: user._id,
      token,
      expiresAt: new Date(Date.now() + 3600000),
    });

    try {
      const clientOrigin = req.get("origin") || req.get("referer");
      await sendPasswordResetEmail(user.email, user.name, token, clientOrigin);
      console.log(`📧 Reset email sent to: ${user.email}`);
      return res.json({
        success: true,
        message: `Reset link sent to ${user.email}`,
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError.message);

      if (isProduction()) {
        return res.json(genericResponse);
      }

      return res.json({
        success: true,
        message: "Email failed. Use the fallback link below.",
        token,
        emailError: emailError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return invalid(
        res,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    const record = await PasswordResetToken.findOne({ token, used: false });
    if (!record || record.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(record.user, { password: hashed });

    record.used = true;
    await record.save();

    await PasswordResetToken.updateMany(
      { user: record.user, used: false },
      { used: true }
    );

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (typeof oldPassword !== "string" || !oldPassword) {
      return invalid(res, "Old password is required");
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return invalid(
        res,
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Old password wrong" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed" });
  } catch (error) {
    next(error);
  }
};
