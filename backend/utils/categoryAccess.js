const Category = require("../models/Category");
const { isValidObjectId } = require("./validation");

/**
 * Resolve a category the requesting student is allowed to use.
 * A category is accessible when it is a system default or was created by the
 * student themself. Other students' private categories are treated as missing
 * so their names never leak across accounts.
 */
async function getAccessibleCategory(userId, categoryId, expectedType) {
  if (!isValidObjectId(categoryId)) {
    return { category: null, error: "Invalid category id" };
  }

  const category = await Category.findById(categoryId);
  if (!category || category.isActive === false) {
    return { category: null, error: "Category not found" };
  }

  const isOwned =
    category.isDefault || String(category.createdBy) === String(userId);
  if (!isOwned) {
    return { category: null, error: "Category not found" };
  }

  if (expectedType && category.type !== expectedType) {
    return {
      category: null,
      error: `Category "${category.name}" is a ${category.type} category`,
    };
  }

  return { category, error: null };
}

module.exports = { getAccessibleCategory };
