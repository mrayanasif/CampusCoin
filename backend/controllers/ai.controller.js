const AIClassification = require("../models/AIClassification");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const {
  saveCategorizationFeedback,
  shapeSuggestion,
  suggestCategoryForDescription,
} = require("../services/ai.service");
const { generateDescriptionSuggestions } = require("../services/groq.service");
const { isValidObjectId } = require("../utils/validation");

const invalid = (res, message) =>
  res.status(400).json({ success: false, message });

exports.categorize = async (req, res, next) => {
  try {
    const { description } = req.body || {};

    if (typeof description !== "string" || !description.trim()) {
      return invalid(res, "Description required");
    }

    const trimmed = description.trim().slice(0, 300);

    const [availableCategories, initialResult] = await Promise.all([
      Category.find({
        $or: [{ isDefault: true }, { createdBy: req.user.id }],
        isActive: true,
      }).select("name type _id"),
      suggestCategoryForDescription(req.user.id, trimmed),
    ]);

    let result = initialResult;
    let suggestedDescriptions = [];

    try {
      const groqRes = await generateDescriptionSuggestions(trimmed, availableCategories);
      if (groqRes && Array.isArray(groqRes.suggestedDescriptions)) {
        suggestedDescriptions = groqRes.suggestedDescriptions;
      }
      if (groqRes && groqRes.suggestedCategory) {
        const matched = availableCategories.find(
          (c) => c.name.toLowerCase() === groqRes.suggestedCategory.toLowerCase()
        );
        if (matched) {
          result = { category: matched, confidence: 0.92, learned: false, source: "groq-ai" };
        }
      }
    } catch (e) {
      console.warn("Groq categorization suggestion failed:", e.message);
    }

    // Persist the suggestion so /ai/categorize/feedback can update it
    if (result && result.category) {
      await AIClassification.findOneAndUpdate(
        { user: req.user.id, description: trimmed },
        {
          user: req.user.id,
          description: trimmed,
          suggestedCategory: result.category._id,
          confidence: Number((result.confidence || 0).toFixed(2)),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      success: true,
      ...shapeSuggestion(result),
      suggestedDescriptions,
      description: trimmed,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveFeedback = async (req, res, next) => {
  try {
    const { description, userSelectedCategory, suggestedCategory, transactionId } =
      req.body || {};

    if (typeof description !== "string" || !description.trim()) {
      return invalid(res, "Description required");
    }
    if (!isValidObjectId(userSelectedCategory)) {
      return invalid(res, "A valid userSelectedCategory is required");
    }
    if (suggestedCategory !== undefined && suggestedCategory !== null) {
      if (!isValidObjectId(suggestedCategory)) {
        return invalid(res, "suggestedCategory must be a valid category id");
      }
    }

    let ownedTransactionId = null;
    if (transactionId !== undefined && transactionId !== null) {
      if (!isValidObjectId(transactionId)) {
        return invalid(res, "transactionId must be a valid transaction id");
      }
      const owned = await Transaction.findOne({
        _id: transactionId,
        user: req.user.id,
        deletedAt: null,
      }).select("_id aiSuggestedCategory");
      if (!owned) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }
      ownedTransactionId = owned._id;
    }

    const feedback = await saveCategorizationFeedback(req.user.id, {
      description: description.trim().slice(0, 300),
      userSelectedCategory,
      suggestedCategory,
      transactionId: ownedTransactionId,
    });

    if (ownedTransactionId && suggestedCategory) {
      await Transaction.updateOne(
        { _id: ownedTransactionId, user: req.user.id, deletedAt: null },
        {
          aiSuggestedCategory: suggestedCategory,
          aiSuggestionAccepted: String(suggestedCategory) === String(userSelectedCategory),
        }
      );
    }

    res.json({ success: true, message: "Feedback saved", feedback });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await AIClassification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
};

exports.chatbot = async (req, res) => {
  res.json({
    success: true,
    message: "Chatbot is not available yet. Use saving tips and insights instead.",
  });
};
