const dns = require("node:dns");
const mongoose = require("mongoose");
const Category = require("../models/Category");

// Fix MongoDB SRV DNS resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
    seeded: false,
  };
}

async function ConnectDB() {
  // Reuse an existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // Check environment variable
  if (!process.env.DBURI) {
    throw new Error(
      "DBURI is missing. Check your backend .env file."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.DBURI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
      })
      .then((connection) => {
        console.log("MongoDB Connected Successfully");
        console.log("Database:", connection.connection.name);
        console.log("Host:", connection.connection.host);

        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.conn = null;
    cached.promise = null;

    console.error(
      "MongoDB Connection Failed:",
      error.message
    );

    throw error;
  }

  // Seed default categories only once per cached connection
  if (!cached.seeded) {
    cached.seeded = true;

    seedCategories().catch((error) => {
      cached.seeded = false;
      console.error("Category Seed Error:", error.message);
    });
  }

  return cached.conn;
}

async function seedCategories() {
  const count = await Category.countDocuments({
    isDefault: true,
  });

  if (count > 0) {
    console.log(
      `${count} default categories already exist`
    );
    return;
  }

  const defaults = [
    {
      name: "Allowance",
      type: "income",
      icon: "💰",
      isDefault: true,
    },
    {
      name: "Part-time Job",
      type: "income",
      icon: "💼",
      isDefault: true,
    },
    {
      name: "Scholarship",
      type: "income",
      icon: "🎓",
      isDefault: true,
    },
    {
      name: "Gift",
      type: "income",
      icon: "🎁",
      isDefault: true,
    },
    {
      name: "Other Income",
      type: "income",
      icon: "💵",
      isDefault: true,
    },
    {
      name: "Food",
      type: "expense",
      icon: "🍔",
      isDefault: true,
    },
    {
      name: "Transport",
      type: "expense",
      icon: "🚌",
      isDefault: true,
    },
    {
      name: "Hostel/Rent",
      type: "expense",
      icon: "🏠",
      isDefault: true,
    },
    {
      name: "Academics",
      type: "expense",
      icon: "📚",
      isDefault: true,
    },
    {
      name: "Subscriptions",
      type: "expense",
      icon: "📺",
      isDefault: true,
    },
    {
      name: "Entertainment",
      type: "expense",
      icon: "🎬",
      isDefault: true,
    },
    {
      name: "Miscellaneous",
      type: "expense",
      icon: "📦",
      isDefault: true,
    },
  ];

  await Category.insertMany(defaults);

  console.log(
    `${defaults.length} default categories seeded`
  );
}

module.exports = ConnectDB;
