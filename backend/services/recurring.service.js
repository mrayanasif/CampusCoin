const RecurringTransaction = require("../models/RecurringTransaction");
const Transaction = require("../models/Transaction");
const { checkBudgetAlert } = require("./budgetAlert.service");

// Safety cap so a stale recurring item (e.g. started 2 years ago) is materialised
// progressively across runs instead of inserting hundreds of rows in one request.
const MAX_OCCURRENCES_PER_RUN = 12;

function advanceDate(date, frequency) {
  const next = new Date(date);
  if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

/**
 * Materialise every due occurrence of a user's active recurring transactions.
 * Idempotent: a transaction already linked to (recurringTransaction, occurrence)
 * is never inserted twice, so repeated calls are safe.
 */
async function processDueRecurringForUser(userId, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const limit = Number(options.limit) || MAX_OCCURRENCES_PER_RUN;

  const due = await RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextOccurrence: { $lte: now },
  });

  let created = 0;
  const createdTransactions = [];
  const alertedCategories = new Set();

  for (const item of due) {
    let occurrence = new Date(item.nextOccurrence);
    let createdForItem = 0;

    while (occurrence <= now && createdForItem < limit) {
      if (item.endDate && occurrence > new Date(item.endDate)) {
        item.isActive = false;
        break;
      }

      // Idempotency choice: the duplicate check intentionally ignores
      // `deletedAt`, so a soft-deleted recurring occurrence is NOT re-created
      // by the next sweep (deleting an entry means the student does not want it
      // back). Restoring the transaction also restores the occurrence.
      const alreadyCreated = await Transaction.exists({
        user: userId,
        recurringTransaction: item._id,
        recurringOccurrence: occurrence,
      });

      if (!alreadyCreated) {
        const transaction = await Transaction.create({
          user: userId,
          category: item.category,
          amount: item.amount,
          type: item.type,
          description: item.description || "",
          date: new Date(occurrence),
          isRecurring: true,
          source: "recurring",
          recurringTransaction: item._id,
          recurringOccurrence: new Date(occurrence),
        });
        created += 1;
        createdForItem += 1;
        createdTransactions.push(transaction);

        if (item.type === "expense") {
          alertedCategories.add(String(item.category));
        }
      }

      occurrence = advanceDate(occurrence, item.frequency);
    }

    if (item.endDate && occurrence > new Date(item.endDate)) {
      item.isActive = false;
    }

    if (Number(item.nextOccurrence) !== Number(occurrence)) {
      item.nextOccurrence = occurrence;
      await item.save();
    }
  }

  for (const categoryId of alertedCategories) {
    checkBudgetAlert(userId, categoryId, "expense").catch(() => {});
  }

  return {
    processedItems: due.length,
    createdTransactions: created,
    created: createdTransactions,
  };
}

module.exports = { advanceDate, processDueRecurringForUser };
