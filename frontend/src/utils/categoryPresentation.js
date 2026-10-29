export function getExpenseCategoryOrderKey() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return `campuscoin:expense-category-order:${user._id || user.id || "current-user"}`;
  } catch {
    return "campuscoin:expense-category-order:current-user";
  }
}

export function saveExpenseCategoryOrder(ids) {
  localStorage.setItem(getExpenseCategoryOrderKey(), JSON.stringify(ids));
}

export function sortExpenseCategories(categories = [], savedOrder = null) {
  let storedOrder = savedOrder;
  if (!Array.isArray(storedOrder)) {
    try {
      storedOrder = JSON.parse(localStorage.getItem(getExpenseCategoryOrderKey()) || "[]");
    } catch {
      storedOrder = [];
    }
  }
  const positions = new Map(storedOrder.map((id, index) => [id, index]));
  return [...categories].sort((a, b) => {
    const aIndex = positions.get(a._id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = positions.get(b._id) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export function displayCategoryName(name = "") {
  if (!/^academics\b/i.test(name)) return name;
  return name
    .replace(/\bbook\b/i, "Books")
    .replace(/\bstation(?:ionary|ary)\b/i, "Stationery");
}

