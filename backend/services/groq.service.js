const https = require("https");

const GROQ_API_KEY = process.env.GROQ_API_KEY
const MODEL_NAME = "qwen/qwen3.8-27b";


function callGroqApi(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = https.request(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.choices?.[0]?.message?.content || "");
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Groq API error: ${res.statusCode} ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Groq API request timed out"));
    });

    req.write(postData);
    req.end();
  });
}


async function generateAiInsightsAndTips({
  thisMonthName = "this month",
  thisMonthExpense = 0,
  lastMonthExpense = 0,
  topCategory = "Food",
  topCategorySpent = 0,
  topCategoryLastMonth = 0,
  categoryBreakdown = [],
  currency = "₨ ",
}) {

  let growthPercent = 0;
  if (topCategoryLastMonth > 0) {
    growthPercent = Math.round(
      ((topCategorySpent - topCategoryLastMonth) / topCategoryLastMonth) * 100
    );
  } else if (topCategorySpent > 0 && lastMonthExpense > 0) {
    growthPercent = Math.round((topCategorySpent / (lastMonthExpense || 1)) * 40);
  } else {
    growthPercent = 40;
  }


  const observedCategories = categoryBreakdown
    .filter((row) => Number(row.total) > 0 && String(row.category || "").trim())
    .sort((a, b) => Number(b.total) - Number(a.total));
  const fallbackTips = observedCategories.length
    ? observedCategories.slice(0, 3).map((row) => {
        const category = String(row.category).trim();
        const spent = Number(row.total) || 0;
        const savings = Math.max(1, Math.round(spent * 0.15));
        return {
          title: `Reduce ${category} spending`,
          message: `Your insight shows ${currency}${spent.toLocaleString()} spent in ${category}. Review the largest purchases in this category and set a weekly cap to target about ${currency}${savings.toLocaleString()} in savings.`,
          potentialSavings: savings,
          category,
        };
      })
    : [
        {
          title: "Track one flexible expense this week",
          message: "Your latest insight has no category breakdown yet. Track your flexible purchases this week so the next insight can identify a specific place to save.",
          potentialSavings: 0,
          category: "",
        },
      ];
  const fallback = {
    spendingInsight: `You spent ${growthPercent}% more on ${topCategory || "Food"} this month compared to last month.`,
    recommendation: `Try cooking at home to save around ${currency}${currency.includes("₨") ? Math.max(500, Math.round(thisMonthExpense * 0.03)) : 30}!`,
    savingTips: fallbackTips,
  };

  if (!GROQ_API_KEY) {
    return fallback;
  }

  const prompt = `
Analyze this university student's spending and return valid JSON with:
1. "spendingInsight": A 1-sentence analysis comparing spending (e.g. "You spent ${growthPercent}% more on ${topCategory} this month compared to last month.").
2. "recommendation": A practical, encouraging 1-line recommendation with estimated saving (e.g. "Try cooking at home to save around ${currency}30!").
3. "savingTips": Up to 3 highly actionable saving tips based strictly on the supplied spending insight and category data. Do not offer generic Food, Transport, or subscription advice unless that category appears in the data. If fewer than three categories have spending, return fewer tips rather than inventing categories. Each tip must be an object:
   - "title": e.g. "Limit food delivery to 2 times a week"
   - "message": short practical explanation
   - "potentialSavings": numeric estimated monthly savings amount (e.g. 25)
   - "category": an exact category name from the supplied category data; use an empty string when no category applies

Data:
- Month: ${thisMonthName}
- Current Total Expense: ${currency}${thisMonthExpense}
- Previous Month Expense: ${currency}${lastMonthExpense}
- Top Category: ${topCategory} (${currency}${topCategorySpent})
- Other Categories: ${JSON.stringify(categoryBreakdown.slice(0, 4))}

Each tip must explain what the data shows and give a concrete action for that observed category. Estimate savings from that category's recorded spending, and never claim spending that is absent from the data.

Respond strictly with RAW JSON only. Do not wrap in markdown or backticks.
`;

  try {
    const rawContent = await callGroqApi({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful, student-friendly AI financial coach for CampusCoin. Return ONLY valid JSON, no conversational text or markdown code fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const cleanJson = rawContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      spendingInsight:
        parsed.spendingInsight || fallback.spendingInsight,
      recommendation:
        parsed.recommendation || fallback.recommendation,
      savingTips:
        Array.isArray(parsed.savingTips) && parsed.savingTips.length > 0
          ? parsed.savingTips.map((t, idx) => ({
            title: t.title || fallback.savingTips[idx]?.title || "Manage expenses",
            message: t.message || fallback.savingTips[idx]?.message || "Reduce non-essential costs.",
            potentialSavings: Number(t.potentialSavings) || fallback.savingTips[idx]?.potentialSavings || 15,
            category: t.category || fallback.savingTips[idx]?.category || "General",
          }))
          : fallback.savingTips,
    };
  } catch (error) {
    console.warn("Groq AI failed, using intelligent fallback:", error.message);
    return fallback;
  }
}


async function generateDescriptionSuggestions(inputText, availableCategories = []) {
  const trimmed = String(inputText || "").trim();
  if (!trimmed) {
    return {
      suggestedCategory: null,
      suggestedDescriptions: [],
    };
  }

  const lower = trimmed.toLowerCase();


  const ruleFallbacks = {
    food: {
      category: "Food",
      descriptions: [
        "Lunch at campus cafeteria",
        "Dinner delivery from restaurant",
        "Weekly grocery shopping",
        "Coffee and snacks between lectures",
      ],
    },
    burger: {
      category: "Food",
      descriptions: [
        "Burger & fries at campus cafe",
        "Fast food takeout with friends",
        "Evening burger meal",
      ],
    },
    pizza: {
      category: "Food",
      descriptions: [
        "Pizza dinner with study group",
        "Late night pizza delivery",
        "Slice of pizza at cafeteria",
      ],
    },
    biryani: {
      category: "Food",
      descriptions: [
        "Chicken biryani lunch at canteen",
        "Biryani parcel for dinner",
        "Weekend biryani treat with roommates",
      ],
    },
    canteen: {
      category: "Food",
      descriptions: [
        "Lunch at university canteen",
        "Tea and samosa evening snacks",
        "Campus canteen refreshments",
      ],
    },
    tea: {
      category: "Food",
      descriptions: [
        "Chai and biscuits at dhaba",
        "Evening tea with classmates",
        "Campus cafe tea & snack",
      ],
    },
    coffee: {
      category: "Food",
      descriptions: [
        "Iced coffee before morning lecture",
        "Coffee & study session at cafe",
        "Campus espresso bar coffee",
      ],
    },
    transport: {
      category: "Transport",
      descriptions: [
        "Daily bus or metro commute",
        "Uber / Careem ride to campus",
        "Monthly student transport pass",
      ],
    },
    uber: {
      category: "Transport",
      descriptions: [
        "Uber ride to university campus",
        "Uber ride back home from library",
        "Shared cab ride with classmates",
      ],
    },
    bus: {
      category: "Transport",
      descriptions: [
        "University bus semester card",
        "City bus ticket fare",
        "Intercity bus travel to hometown",
      ],
    },
    petrol: {
      category: "Transport",
      descriptions: [
        "Bike / car fuel refilling",
        "Weekly petrol expense for commute",
        "Fuel contribution for road trip",
      ],
    },
    book: {
      category: "Academics",
      descriptions: [
        "Semester textbooks and study guides",
        "Course reference materials",
        "Notebooks and lecture stationery",
      ],
    },
    academics: {
      category: "Academics",
      descriptions: [
        "Semester examination fee",
        "Course textbooks and notes",
        "Printing and photocopying assignments",
      ],
    },
    hostel: {
      category: "Hostel/Rent",
      descriptions: [
        "Monthly hostel accommodation fee",
        "Hostel mess and utility dues",
        "Dorm maintenance payment",
      ],
    },
    rent: {
      category: "Hostel/Rent",
      descriptions: [
        "Monthly room rent payment",
        "Apartment maintenance charges",
        "Shared flat utility contribution",
      ],
    },
    entertainment: {
      category: "Entertainment",
      descriptions: [
        "Movie ticket with friends",
        "Gaming and recreational outing",
        "Weekend hangout with college friends",
      ],
    },
    movie: {
      category: "Entertainment",
      descriptions: [
        "Cinema ticket for weekend show",
        "Movie snacks and popcorn",
        "IMAX movie with friends",
      ],
    },
    subscription: {
      category: "Subscriptions",
      descriptions: [
        "Spotify student premium",
        "Netflix monthly streaming subscription",
        "YouTube Premium family plan",
      ],
    },
  };

  let defaultMatched = null;
  for (const [key, val] of Object.entries(ruleFallbacks)) {
    if (lower.includes(key)) {
      defaultMatched = val;
      break;
    }
  }

  const fallback = defaultMatched || {
    category: null,
    descriptions: [
      `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)} expense`,
      `Payment for ${trimmed}`,
      `Personal expense - ${trimmed}`,
    ],
  };

  if (!GROQ_API_KEY) {
    return fallback;
  }

  const catNames =
    availableCategories.length > 0
      ? availableCategories.map((c) => c.name || c).join(", ")
      : "Food, Transport, Academics, Entertainment, Subscriptions, Hostel/Rent, Allowance, Part-time Job, Gift, Miscellaneous";

  const prompt = `
The student is adding an expense in their college finance app and typed this short input: "${trimmed}".
Available categories: ${catNames}.

Return a raw JSON object with:
1. "suggestedCategory": The single best category matching this expense from the available categories list.
2. "suggestedDescriptions": An array of 3 or 4 clear, realistic, 1-line descriptions for what this expense could be.
For example:
- If user types "Food" or "biryani", suggest: ["Lunch at campus cafeteria", "Dinner delivery from restaurant", "Weekly grocery shopping", "Coffee and snacks with friends"].
- If user types "books", suggest: ["Semester textbooks & course materials", "Notebooks & stationery supplies", "Library printing & photocopying"].
- If user types "uber", suggest: ["Uber ride to university campus", "Late night shared cab home", "Taxi fare for group study"].

Each description must be concise (under 8 words), realistic for a student, and specific.
Respond with RAW JSON ONLY:
{
  "suggestedCategory": "...",
  "suggestedDescriptions": ["...", "...", "..."]
}
`;

  try {
    const rawContent = await callGroqApi({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent financial assistant for CampusCoin. Return ONLY valid JSON, no markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 350,
    });

    const cleanJson = rawContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanJson);

    return {
      suggestedCategory: parsed.suggestedCategory || fallback.category,
      suggestedDescriptions:
        Array.isArray(parsed.suggestedDescriptions) &&
          parsed.suggestedDescriptions.length > 0
          ? parsed.suggestedDescriptions
          : fallback.descriptions,
    };
  } catch (error) {
    console.warn("Groq description suggestions failed:", error.message);
    return fallback;
  }
}

module.exports = {
  generateAiInsightsAndTips,
  generateDescriptionSuggestions,
};

