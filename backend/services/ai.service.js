const Category = require("../models/Category");
const AIClassification = require("../models/AIClassification");
const Transaction = require("../models/Transaction");
const { escapeRegex } = require("../utils/validation");

// Lightweight rule-based categoriser. It is intentionally offline/deterministic
// (no paid API required) but it *learns* from the user's own corrections and
// previous transactions, which is what the SRS asks for.
const KEYWORD_RULES = [
  { category: "Food", words: ["cafe", "cafeteria", "food", "lunch", "dinner", "breakfast", "restaurant", "pizza", "burger", "canteen", "biryani", "snack", "coffee", "tea", "meal", "grocery", "groceries", "samosa", "shawarma", "dhaba"] },
  { category: "Transport", words: ["bus", "taxi", "uber", "careem", "rickshaw", "petrol", "fuel", "diesel", "train", "metro", "fare", "transport", "ride", "bike", "van"] },
  { category: "Academics", words: ["book", "books", "tuition", "fee", "fees", "course", "stationery", "pen", "pencil", "notebook", "exam", "printing", "photocopy", "library", "semester"] },
  { category: "Entertainment", words: ["movie", "cinema", "game", "gaming", "netflix", "party", "outing", "concert", "bowling", "arcade"] },
  { category: "Subscriptions", words: ["spotify", "subscription", "app", "youtube", "prime", "icloud", "canva", "chatgpt", "adobe"] },
  { category: "Hostel/Rent", words: ["hostel", "rent", "room", "accommodation", "dorm", "mess", "lease"] },
  { category: "Allowance", words: ["allowance", "pocket money", "monthly allowance", "parents"] },
  { category: "Part-time Job", words: ["salary", "wage", "wages", "internship", "freelance", "job", "stipend", "paycheck"] },
  { category: "Scholarship", words: ["scholarship", "grant", "financial aid", "merit"] },
  { category: "Gift", words: ["gift", "birthday", "eidi", "present"] },
];

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

async function findCategoryByName(userId, name, type) {
  if (!name) return null;
  const exact = new RegExp(`^${escapeRegex(name)}$`, "i");
  const typeFilter = type ? { type } : {};
  return (
    (await Category.findOne({ name: exact, isDefault: true, isActive: true, ...typeFilter })) ||
    (await Category.findOne({
      name: exact,
      createdBy: userId,
      isActive: true,
      ...typeFilter,
    })) ||
    (await Category.findOne({ name: exact, isDefault: true, ...typeFilter }))
  );
}

function keywordSuggestion(description) {
  const lower = String(description || "").toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((word) => lower.includes(word))) return rule.category;
  }
  return null;
}

/**
 * Resolve the best category for a free-text description, using (in order):
 * 1. exact match against the user's previous corrections;
 * 2. token overlap with previous corrections (learning);
 * 3. token/keyword rules for the default categories;
 * 4. the user's own transaction history (same words were categorised before);
 * 5. "Miscellaneous" fallback.
 */
async function suggestCategoryForDescription(userId, description, options = {}) {
  const text = String(description || "").trim();
  if (!text) return { category: null, confidence: 0, learned: false, source: "none" };

  const lowered = text.toLowerCase();
  const tokens = tokenize(text);

  const corrections = await AIClassification.find({
    user: userId,
    wasCorrected: true,
    userSelectedCategory: { $ne: null },
  })
    .sort({ updatedAt: -1 })
    .limit(300);

  let bestCorrection = null;
  for (const correction of corrections) {
    const correctionText = String(correction.description || "").toLowerCase().trim();
    if (!correctionText) continue;

    if (correctionText === lowered) {
      const exact = await Category.findById(correction.userSelectedCategory);
      if (exact && exact.isActive !== false) {
        return {
          category: exact,
          confidence: 0.98,
          learned: true,
          source: "learned-exact",
        };
      }
    }

    const correctionTokens = tokenize(correction.description);
    const overlap = tokens.filter((token) => correctionTokens.includes(token)).length;
    if (overlap === 0) continue;

    // Exact description already handled; partial overlaps get a bounded score.
    const score = overlap / Math.max(tokens.length, correctionTokens.length);
    if (score >= 0.5 && (!bestCorrection || score > bestCorrection.score)) {
      bestCorrection = { categoryId: correction.userSelectedCategory, score };
    }
  }

  if (bestCorrection) {
    const learnedCategory = await Category.findById(bestCorrection.categoryId);
    if (learnedCategory && learnedCategory.isActive !== false) {
      return {
        category: learnedCategory,
        confidence: Math.min(0.9, 0.6 + bestCorrection.score * 0.3),
        learned: true,
        source: "learned-similar",
      };
    }
  }

  const ruleName = keywordSuggestion(text);
  if (ruleName) {
    const ruleCategory = await findCategoryByName(userId, ruleName, options.type);
    if (ruleCategory) {
      return {
        category: ruleCategory,
        confidence: 0.7,
        learned: false,
        source: "keyword",
      };
    }
  }

  // Fall back to the user's own history: descriptions sharing a token.
  if (tokens.length > 0) {
    const history = await Transaction.find({
      user: userId,
      deletedAt: null,
      description: new RegExp(tokens.map(escapeRegex).join("|"), "i"),
    })
      .select("category description")
      .sort({ createdAt: -1 })
      .limit(50);

    if (history.length > 0) {
      const counts = new Map();
      for (const txn of history) {
        const key = String(txn.category);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const [topCategoryId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const historyCategory = await Category.findById(topCategoryId);
      if (historyCategory && historyCategory.isActive !== false) {
        return {
          category: historyCategory,
          confidence: 0.55,
          learned: false,
          source: "history",
        };
      }
    }
  }

  if (!options.skipFallback) {
    const fallback = await findCategoryByName(
      userId,
      options.type === "income" ? "Other Income" : "Miscellaneous",
      options.type
    );
    if (fallback) {
      return {
        category: fallback,
        confidence: 0.3,
        learned: false,
        source: "fallback",
      };
    }
  }

  return { category: null, confidence: 0, learned: false, source: "none" };
}

function shapeSuggestion(result) {
  if (!result || !result.category) {
    return { suggestedCategory: null, confidence: 0, learned: false };
  }
  return {
    suggestedCategory: { id: result.category._id, name: result.category.name },
    suggestedCategoryId: result.category._id,
    confidence: Number(result.confidence.toFixed(2)),
    learned: Boolean(result.learned),
    source: result.source,
  };
}

/**
 * Persist / refresh the feedback record for a description so future suggestions
 * can learn from the category the student actually picked.
 */
async function saveCategorizationFeedback(
  userId,
  { description, suggestedCategory, userSelectedCategory, transactionId }
) {
  const trimmed = String(description || "").trim();
  if (!trimmed) return null;

  const correctedCategory = userSelectedCategory || suggestedCategory;
  if (!correctedCategory) return null;

  const wasCorrected = Boolean(
    userSelectedCategory &&
      suggestedCategory &&
      String(userSelectedCategory) !== String(suggestedCategory)
  );

  const record = await AIClassification.findOne({ user: userId, description: trimmed }).sort({
    updatedAt: -1,
  });

  if (record) {
    if (suggestedCategory) record.suggestedCategory = suggestedCategory;
    else if (!record.suggestedCategory) record.suggestedCategory = correctedCategory;
    record.userSelectedCategory = correctedCategory;
    record.wasCorrected = true;
    if (transactionId) record.transaction = transactionId;
    await record.save();
    return record;
  }

  return AIClassification.create({
    user: userId,
    transaction: transactionId || null,
    description: trimmed,
    suggestedCategory: suggestedCategory || correctedCategory,
    userSelectedCategory: correctedCategory,
    wasCorrected: true,
    confidence: 0.5,
  });
}

module.exports = {
  KEYWORD_RULES,
  findCategoryByName,
  saveCategorizationFeedback,
  shapeSuggestion,
  suggestCategoryForDescription,
  tokenize,
};
