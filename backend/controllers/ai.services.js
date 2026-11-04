const { GoogleGenerativeAI } = require("@google/generative-ai");
const Category = require("../models/Category");
const AIClassification = require("../models/AIClassification");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


async function suggestCategoryForDescription(userId, description) {
  try {
    const categories = await Category.find({
      $or: [{ isDefault: true }, { createdBy: userId }],
      isActive: true,
    }).select("_id name");

    const categoryNames = categories.map((c) => c.name).join(", ");


    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an AI expense categorizer.
      Based on the description "${description}", choose the most appropriate category.
      You must choose ONLY from the following categories: [${categoryNames}].
      Reply with just the category name and nothing else. If nothing matches, reply with "Miscellaneous".
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();


    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === responseText.toLowerCase()
    ) || categories.find((c) => c.name === "Miscellaneous");

    return {
      category: matchedCategory || null,
      confidence: 0.95, 
    };

  } catch (error) {
    console.error("Gemini AI Error:", error.message);

    return fallbackKeywordSuggestion(userId, description);
  }
}

function shapeSuggestion(result) {
  return {
    suggestedCategory: result.category
      ? { id: result.category._id, name: result.category.name }
      : null,
    confidence: result.confidence,
  };
}

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