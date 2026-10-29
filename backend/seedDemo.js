// Campus Coin demo data seed (idempotent, safe to re-run).
//
// Usage:
//   npm run seed          (from backend/)
//
// Creates:
//   - admin@campuscoin.test / Admin@12345   (role: admin)
//   - student@campuscoin.test / Student@12345 (Ayesha Khan, demo data)
//   - student2@campuscoin.test / Student@12345 (login-only second student)
//   - 6 months of realistic transactions for the main demo student,
//     current-month budgets, a monthly recurring allowance and 2 stored insights.
//
// Re-running only removes/recreates data belonging to these demo accounts.
// NEVER run this against a production database with real students unless you
// really mean to (guard: requires ALLOW_DEMO_SEED=true when NODE_ENV=production).

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const ConnectDB = require("./config/db");
const User = require("./models/User");
const Category = require("./models/Category");
const Transaction = require("./models/Transaction");
const Budget = require("./models/Budget");
const RecurringTransaction = require("./models/RecurringTransaction");
const Insight = require("./models/Insight");
const SavingTip = require("./models/SavingTip");
const { generateTipsForUser } = require("./services/tip.service");

const DEMO_PASSWORD_HASH_ROUNDS = 10;
const MONTHS_OF_HISTORY = 6;
const CURRENT_MONTH_BUDGETS = [
  { category: "Food", limitAmount: 4000 },
  { category: "Transport", limitAmount: 1500 },
  { category: "Subscriptions", limitAmount: 1200 },
];

const DEMO_ACCOUNTS = {
  admin: {
    email: "admin@campuscoin.test",
    password: "Admin@12345",
    role: "admin",
    name: "Campus Coin Admin",
  },
  student: {
    email: "student@campuscoin.test",
    password: "Student@12345",
    role: "student",
    name: "Ayesha Khan",
    academicYear: "2nd Year",
    monthlyAllowance: 15000,
    savingsGoal: 3000,
  },
  student2: {
    email: "student2@campuscoin.test",
    password: "Student@12345",
    role: "student",
    name: "Bilal Ahmed",
    academicYear: "3rd Year",
    monthlyAllowance: 12000,
    savingsGoal: 2500,
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function monthKey(offsetMonths) {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1)
  );
  return date.toISOString().slice(0, 7);
}

function dateInMonth(offsetMonths, day) {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1)
  );
  const lastDay = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)
  ).getUTCDate();
  let clampedDay = Math.min(day, lastDay);
  if (offsetMonths === 0) clampedDay = Math.min(clampedDay, now.getUTCDate());
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), clampedDay)
  );
}

async function waitForDefaultCategories() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const count = await Category.countDocuments({ isDefault: true });
    if (count >= 12) return count;
    await sleep(250);
  }
  return Category.countDocuments({ isDefault: true });
}

async function upsertDemoUser(account) {
  const hashed = await bcrypt.hash(
    account.password,
    DEMO_PASSWORD_HASH_ROUNDS
  );

  const update = {
    name: account.name,
    email: account.email,
    password: hashed,
    role: account.role,
    isActive: true,
    academicYear: account.academicYear || "",
    monthlyAllowance: account.monthlyAllowance || 0,
    savingsGoal: account.savingsGoal || 0,
  };

  return User.findOneAndUpdate({ email: account.email }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
}

function buildMonthlyTransactions(categoryByName) {
  const rows = [];

  const push = (offset, day, categoryName, type, amount, description) => {
    const category = categoryByName[categoryName];
    if (!category) return;
    rows.push({
      date: dateInMonth(offset, day),
      category: category._id,
      type,
      amount,
      description,
    });
  };

  const monthlyPlan = [
    // income
    { day: 1, category: "Allowance", type: "income", amount: 15000, description: "Monthly allowance from parents" },
    { day: 10, category: "Part-time Job", type: "income", amount: 6000, description: "Weekend shift at campus bookstore" },
    // expenses
    { day: 2, category: "Food", type: "expense", amount: 320, description: "Campus cafe lunch" },
    { day: 5, category: "Food", type: "expense", amount: 760, description: "Groceries from nearby mart" },
    { day: 7, category: "Food", type: "expense", amount: 240, description: "Coffee with friends" },
    { day: 9, category: "Food", type: "expense", amount: 580, description: "Hostel mess dinner" },
    { day: 12, category: "Food", type: "expense", amount: 420, description: "Pizza night with roommates" },
    { day: 15, category: "Food", type: "expense", amount: 280, description: "Canteen snacks" },
    { day: 19, category: "Food", type: "expense", amount: 640, description: "Biryani takeaway" },
    { day: 23, category: "Food", type: "expense", amount: 350, description: "Breakfast at campus cafe" },
    { day: 3, category: "Transport", type: "expense", amount: 180, description: "Bus fare to campus" },
    { day: 8, category: "Transport", type: "expense", amount: 450, description: "Uber ride home" },
    { day: 14, category: "Transport", type: "expense", amount: 220, description: "Rickshaw fare" },
    { day: 22, category: "Transport", type: "expense", amount: 300, description: "Fuel for bike" },
    { day: 4, category: "Subscriptions", type: "expense", amount: 650, description: "Netflix subscription" },
    { day: 12, category: "Subscriptions", type: "expense", amount: 599, description: "Spotify premium" },
    { day: 16, category: "Entertainment", type: "expense", amount: 800, description: "Movie night with friends" },
    { day: 24, category: "Entertainment", type: "expense", amount: 1200, description: "Weekend outing" },
    { day: 11, category: "Academics", type: "expense", amount: 1800, description: "Semester textbook purchase" },
    { day: 17, category: "Academics", type: "expense", amount: 450, description: "Stationery and printing" },
    { day: 20, category: "Miscellaneous", type: "expense", amount: 380, description: "Miscellaneous expenses" },
  ];

  for (let offset = -(MONTHS_OF_HISTORY - 1); offset <= 0; offset += 1) {
    for (const item of monthlyPlan) {
      push(offset, item.day, item.category, item.type, item.amount, item.description);
    }

    // Scholarship arrives every other month.
    if (offset % 2 === 0) {
      push(offset, 6, "Scholarship", "income", 3500, "Merit scholarship installment");
    }
    // Small gift some months.
    if (offset % 3 === 0) {
      push(offset, 26, "Gift", "income", 1500, "Gift from family");
    }
  }

  return rows;
}

async function seed() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    console.error(
      "Refusing to seed demo data while NODE_ENV=production. Set ALLOW_DEMO_SEED=true to override."
    );
    process.exit(1);
  }

  await ConnectDB();
  const categoryCount = await waitForDefaultCategories();

  const categories = await Category.find({ isDefault: true });
  const categoryByName = {};
  for (const category of categories) categoryByName[category.name] = category;

  const [admin, student, student2] = await Promise.all([
    upsertDemoUser(DEMO_ACCOUNTS.admin),
    upsertDemoUser(DEMO_ACCOUNTS.student),
    upsertDemoUser(DEMO_ACCOUNTS.student2),
  ]);

  const demoUserIds = [admin._id, student._id, student2._id];

  // Re-run safety: only touch data owned by the demo accounts.
  await Promise.all([
    Transaction.deleteMany({ user: { $in: demoUserIds } }),
    Budget.deleteMany({ user: { $in: demoUserIds } }),
    RecurringTransaction.deleteMany({ user: { $in: demoUserIds } }),
    Insight.deleteMany({ user: { $in: demoUserIds } }),
    SavingTip.deleteMany({ user: { $in: demoUserIds } }),
  ]);

  const transactionRows = buildMonthlyTransactions(categoryByName);
  const transactions = transactionRows.map((row) => ({
    ...row,
    user: student._id,
    source: "manual",
    isRecurring: false,
  }));

  if (transactions.length > 0) {
    await Transaction.insertMany(transactions);
  }

  const currentMonth = monthKey(0);

  const budgets = CURRENT_MONTH_BUDGETS.filter(
    (budget) => categoryByName[budget.category]
  ).map((budget) => ({
    user: student._id,
    category: categoryByName[budget.category]._id,
    month: currentMonth,
    limitAmount: budget.limitAmount,
    alertPercentage: 80,
    isActive: true,
  }));

  if (budgets.length > 0) {
    await Budget.insertMany(budgets);
  }

  const nextMonthFirstDay = dateInMonth(1, 1);
  if (categoryByName["Allowance"]) {
    await RecurringTransaction.create({
      user: student._id,
      category: categoryByName["Allowance"]._id,
      type: "income",
      amount: 15000,
      description: "Monthly allowance",
      frequency: "monthly",
      startDate: dateInMonth(0, 1),
      nextOccurrence: nextMonthFirstDay,
      endDate: null,
      isActive: true,
    });
  }

  const previousMonth = monthKey(-1);
  const twoMonthsAgo = monthKey(-2);
  const foodCategory = categoryByName["Food"];

  const insightSeeds = [
    {
      month: previousMonth,
      summaryText: `In ${previousMonth}, you spent about ₹9,400 and earned ₹21,500. Food remained your biggest expense, followed by transport and entertainment. Your savings rate was healthy at roughly 56%.`,
      tipText:
        "Your savings are on track. Try moving ₹1,000 of this month's surplus into your savings goal early so it is not spent.",
      flaggedCategories: [
        {
          category: foodCategory ? foodCategory._id : null,
          categoryName: "Food",
          growthPercentage: 28,
          message: "Food spending rose 28% compared to your recent average.",
        },
      ],
    },
    {
      month: twoMonthsAgo,
      summaryText: `In ${twoMonthsAgo}, you spent about ₹8,900 and earned ₹18,400. Subscriptions and entertainment took a bigger share than usual, while food stayed steady.`,
      tipText:
        "Cancel any subscription you did not use this month — even one unused plan saves more than cutting small daily purchases.",
      flaggedCategories: [
        {
          category: categoryByName["Subscriptions"]
            ? categoryByName["Subscriptions"]._id
            : null,
          categoryName: "Subscriptions",
          growthPercentage: 22,
          message:
            "Subscriptions spending rose 22% compared to your recent average.",
        },
      ],
    },
  ];

  for (const insight of insightSeeds) {
    await Insight.findOneAndUpdate(
      { user: student._id, month: insight.month },
      {
        user: student._id,
        ...insight,
        generatedBy: "system",
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Pre-generate saving tips so the dashboard is useful immediately.
  const tips = await generateTipsForUser(student._id);

  const [
    transactionCount,
    budgetCount,
    recurringCount,
    insightCount,
    savingTipCount,
  ] = await Promise.all([
    Transaction.countDocuments({ user: student._id, deletedAt: null }),
    Budget.countDocuments({ user: student._id }),
    RecurringTransaction.countDocuments({ user: student._id }),
    Insight.countDocuments({ user: student._id }),
    SavingTip.countDocuments({ user: student._id }),
  ]);

  console.log("\n=== Campus Coin demo seed complete ===");
  console.log(`Admin:    ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}  (role: admin)`);
  console.log(`Student:  ${DEMO_ACCOUNTS.student.email} / ${DEMO_ACCOUNTS.student.password}  (role: student)`);
  console.log(`Student2: ${DEMO_ACCOUNTS.student2.email} / ${DEMO_ACCOUNTS.student2.password}  (role: student)`);
  console.log(
    `Counts: users=3 categories=${categoryCount} transactions=${transactionCount} budgets=${budgetCount} recurring=${recurringCount} insights=${insightCount} savingTips=${savingTipCount}`
  );
  console.log(
    `Demo student data covers ${MONTHS_OF_HISTORY} months (${monthKey(-(MONTHS_OF_HISTORY - 1))} .. ${currentMonth}).`
  );

  if (Array.isArray(tips)) {
    console.log(`Generated tips for demo student: ${tips.length}`);
  }
}

seed()
  .then(async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Demo seed failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
