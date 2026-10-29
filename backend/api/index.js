const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoose = require("mongoose");

dotenv.config();

const ConnectDB = require("../config/db");
const errorHandler = require("../middleware/error.middleware");
const { getJwtSecret } = require("../utils/jwt");

// Fail fast on insecure production deployments: throws when NODE_ENV is
// "production" and JWT_SECRET is missing (dev keeps the fallback + warning).
getJwtSecret();

const app = express();

// Required so rate limiting sees the real client IP behind Vercel/reverse proxies.
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:5000",
      "https://sfc-mindforge-frontend.vercel.app",
      "https://sfc-mindforge-backend.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: false }));


app.use(async (req, res, next) => {
  try {
    await ConnectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Database connection failed. Please try again.",
      error: error.message,
    });
  }
});


app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;

  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };

  res.json({
    message: "SFC Mindforge API is running",
    server: "Running",
    database: {
      status: states[dbState] || "Unknown",
      readyState: dbState,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
    timestamp: new Date().toLocaleString(),
  });
});


app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };

  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    server: {
      status: "Running",
    },
    database: {
      status: states[dbState] || "Unknown",
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
    timestamp: new Date().toLocaleString(),
  });
});


app.use("/api/auth", require("../routes/auth.routes"));
app.use("/api/users", require("../routes/user.routes"));
app.use("/api/categories", require("../routes/category.routes"));
app.use("/api/transactions", require("../routes/transaction.routes"));
app.use("/api/budgets", require("../routes/budget.routes"));
app.use("/api/recurring", require("../routes/recurring.routes"));
app.use("/api/saving-tips", require("../routes/savingTip.routes"));
app.use("/api/insights", require("../routes/insight.routes"));
app.use("/api/notifications", require("../routes/notification.routes"));
app.use("/api/bookmarks", require("../routes/bookmark.routes"));
app.use("/api/notes", require("../routes/note.routes"));
app.use("/api/reports", require("../routes/report.routes"));
app.use("/api/dashboard", require("../routes/dashboard.routes"));
app.use("/api/import", require("../routes/import.routes"));
app.use("/api/ai", require("../routes/ai.routes"));
app.use("/api/activity", require("../routes/activity.routes"));
app.use("/api/admin", require("../routes/admin.routes"));

// ── TEMPORARY one-time backfill: creates missing allowance transactions ──
// Call once: GET /api/backfill-allowances  — then remove this block.
app.get("/api/backfill-allowances", async (req, res) => {
  try {
    const User = require("../models/User");
    const Transaction = require("../models/Transaction");
    const Category = require("../models/Category");

    let allowanceCat = await Category.findOne({ name: "Allowance", type: "income" });
    if (!allowanceCat) {
      allowanceCat = await Category.create({ name: "Allowance", type: "income", icon: "💰", isDefault: true });
    }

    const users = await User.find({ monthlyAllowance: { $gt: 0 } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const results = [];
    for (const user of users) {
      const existing = await Transaction.findOne({
        user: user._id, type: "income", category: allowanceCat._id,
        description: "Monthly allowance", date: { $gte: monthStart, $lt: monthEnd }, deletedAt: null,
      });
      if (existing) { results.push({ user: user.email, status: "skipped" }); continue; }
      await Transaction.create({
        user: user._id, type: "income", category: allowanceCat._id,
        description: "Monthly allowance", amount: user.monthlyAllowance,
        date: new Date(), source: "manual",
      });
      results.push({ user: user.email, amount: user.monthlyAllowance, status: "created" });
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ── END TEMPORARY ────────────────────────────────────────────────────────


// Consistent JSON 404 for unknown routes instead of Express' HTML default.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});


app.use(errorHandler);


const PORT = process.env.PORT || 5000;

if (require.main === module) {
  const startServer = async () => {
    try {
      await ConnectDB();

      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });

      server.on("error", (error) => {
        console.error("❌ Server error:", error.message);
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;
