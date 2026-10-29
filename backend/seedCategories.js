const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Category = require("./models/Category");

dotenv.config();

const defaultCategories = [
  { name: "Allowance", type: "income", icon: "💰", isDefault: true },
  { name: "Part-time Job", type: "income", icon: "💼", isDefault: true },
  { name: "Scholarship", type: "income", icon: "🎓", isDefault: true },
  { name: "Gift", type: "income", icon: "🎁", isDefault: true },
  { name: "Other Income", type: "income", icon: "💵", isDefault: true },
  { name: "Food", type: "expense", icon: "🍔", isDefault: true },
  { name: "Transport", type: "expense", icon: "🚌", isDefault: true },
  { name: "Hostel/Rent", type: "expense", icon: "🏠", isDefault: true },
  { name: "Academics", type: "expense", icon: "📚", isDefault: true },
  { name: "Subscriptions", type: "expense", icon: "📺", isDefault: true },
  { name: "Entertainment", type: "expense", icon: "🎬", isDefault: true },
  { name: "Miscellaneous", type: "expense", icon: "📦", isDefault: true },
];

async function seed() {
  try {
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.DBURI);
    console.log("✅ Connected!\n");

    await Category.deleteMany({ isDefault: true });
    console.log("🗑️  Old default categories removed");

    const result = await Category.insertMany(defaultCategories);
    console.log(`✅ ${result.length} default categories added!\n`);

    result.forEach((c) => console.log(`   ${c.icon}  ${c.name} (${c.type})`));

    console.log("\n🎉 Done!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seed();