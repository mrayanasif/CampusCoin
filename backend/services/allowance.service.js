const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

async function ensureMonthlyAllowance(user, start, end) {
  const amount = Number(user?.monthlyAllowance || 0);
  if (!user?._id || !Number.isFinite(amount) || amount <= 0) return null;

  const existing = await Transaction.findOne({
    user: user._id,
    type: "income",
    description: /^monthly allowance$/i,
    deletedAt: null,
    date: { $gte: start, $lt: end },
  });
  if (existing) return existing;

  let category = await Category.findOne({ name: /^allowance$/i, type: "income" });
  if (!category) {
    try {
      category = await Category.create({
        name: "Allowance",
        type: "income",
        icon: "💰",
        isDefault: true,
      });
    } catch (error) {
      category = await Category.findOne({ name: /^allowance$/i, type: "income" });
      if (!category) throw error;
    }
  }

  return Transaction.create({
    user: user._id,
    type: "income",
    category: category._id,
    description: "Monthly allowance",
    amount,
    date: new Date(),
    source: "allowance",
  });
}

module.exports = { ensureMonthlyAllowance };
