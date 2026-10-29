const { GoogleGenerativeAI } = require("@google/generative-ai");
const Category = require("../models/Category");
const AIClassification = require("../models/AIClassification");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini AI se category suggest karwana
 */
async function suggestCategoryForDescription(userId, description) {
  try {
    // 1. Database se saari categories nikal lo (taake AI ko pata ho kya options hain)
    const categories = await Category.find({
      $or: [{ isDefault: true }, { createdBy: userId }],
      isActive: true,
    }).select("_id name");

    const categoryNames = categories.map((c) => c.name).join(", ");

    // 2. AI ko prompt bhejo
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an AI expense categorizer.
      Based on the description "${description}", choose the most appropriate category.
      You must choose ONLY from the following categories: [${categoryNames}].
      Reply with just the category name and nothing else. If nothing matches, reply with "Miscellaneous".
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // 3. AI ke jawab ko database ki category se match karo
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === responseText.toLowerCase()
    ) || categories.find((c) => c.name === "Miscellaneous");

    return {
      category: matchedCategory || null,
      confidence: 0.95, // Gemini usually accurate hota hai
    };

  } catch (error) {
    console.error("Gemini AI Error:", error.message);
    // Fallback: Agar API fail ho jaye, to purana Keyword logic chalao (taake app crash na ho)
    return fallbackKeywordSuggestion(userId, description);
  }
}

/**
 * Helper function jo controller ke response format ke liye zaroori hai
 */
function shapeSuggestion(result) {
  return {
    suggestedCategory: result.category
      ? { id: result.category._id, name: result.category.name }
      : null,
    confidence: result.confidence,
  };
}

/**
 * User ke feedback ko save karna
 */
async function saveCategorizationFeedback(userId, data) {
  const { description, userSelectedCategory, suggestedCategory, transactionId } = data;
  return await AIClassification.findOneAndUpdate(
    { user: userId, description },
    {
      user: userId,
      description,
      suggestedCategory,
      userSelectedCategory,
      wasCorrected: true,
      transactionId,
    },
    { upsert: true, new: true }
  );
}

/**
 * Fallback Logic (Agar API quota khatam ho jaye ya internet na ho)
 */
async function fallbackKeywordSuggestion(userId, description) {
  const categories = await Category.find({ isActive: true });
  const lowerDesc = description.toLowerCase();
  
  let suggestedName = "Miscellaneous";
  if (lowerDesc.includes("food") || lowerDesc.includes("lunch") || lowerDesc.includes("cafe")) suggestedName = "Food";
  else if (lowerDesc.includes("uber") || lowerDesc.includes("bus")) suggestedName = "Transport";
  
  const cat = categories.find((c) => c.name === suggestedName);
  return { category: cat, confidence: 0.5 };
}

module.exports = {
  suggestCategoryForDescription,
  shapeSuggestion,
  saveCategorizationFeedback,
};