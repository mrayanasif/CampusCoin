/**
 * backfillAllowance.js
 * One-time script: creates a missing "Monthly allowance" income transaction
 * for every user whose monthlyAllowance > 0 but has no allowance transaction
 * in the current month.
 *
 * Run once:  node backfillAllowance.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Category = require("./models/Category");

async function run() {
  await mongoose.connect(process.env.DBURI);
  console.log("✅ Connected to MongoDB\n");

  // Get or create the Allowance income category
  let allowanceCat = await Category.findOne({ name: "Allowance", type: "income" });
  if (!allowanceCat) {
    allowanceCat = await Category.create({
      name: "Allowance",
      type: "income",
      icon: "💰",
      isDefault: true,
    });
    console.log("📂 Created Allowance category");
  } else {
    console.log(`📂 Using existing Allowance category: ${allowanceCat._id}`);
  }

  const users = await User.find({ monthlyAllowance: { $gt: 0 } });
  console.log(`👥 Found ${users.length} user(s) with allowance > 0\n`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if user already has an allowance income transaction this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const existing = await Transaction.findOne({
      user: user._id,
      type: "income",
      category: allowanceCat._id,
      description: "Monthly allowance",
      date: { $gte: monthStart, $lt: monthEnd },
      deletedAt: null,
    });

    if (existing) {
      console.log(`⏭️  Skipped ${user.name} (${user.email}) — allowance already exists`);
      skipped++;
      continue;
    }

    await Transaction.create({
      user: user._id,
      type: "income",
      category: allowanceCat._id,
      description: "Monthly allowance",
      amount: user.monthlyAllowance,
      date: new Date(),
      source: "manual",
    });
    console.log(`✅ Created allowance Rs.${user.monthlyAllowance} for ${user.name} (${user.email})`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
