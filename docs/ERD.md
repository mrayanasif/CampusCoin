# Campus Coin — Database Design (ERD)

**Database:** MongoDB Atlas (database `test` in the current hosted deployment)
**ODM:** Mongoose 9
**Models:** 17 Mongoose models in `backend/models/` → 17 collections
**Why MongoDB:** the SRS §1.8 explicitly lists MongoDB/JSON as an acceptable database, alongside MySQL/SQL Server. The SRS §1.2 architecture note says “relational database”, but §1.8 takes precedence for the implementation options; this document therefore describes the document-oriented design that was built.

> **STUDENT TO WRITE:** in the final academic report, add a short paragraph explaining *why* a document database suits this app (flexible embedded `flaggedCategories`, JSON-like transactions, Atlas hosting), and acknowledge the SRS §1.2 wording.

---

## 1. Entity–relationship diagram

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role
        string academicYear
        number monthlyAllowance
        number savingsGoal
        string profileImage
        boolean isActive
        date lastLogin
        object preferences
        date createdAt
        date updatedAt
    }

    CATEGORY {
        ObjectId _id PK
        string name
        string type
        boolean isDefault
        ObjectId createdBy FK
        boolean isActive
        string icon
        date createdAt
        date updatedAt
    }

    TRANSACTION {
        ObjectId _id PK
        ObjectId user FK
        ObjectId category FK
        number amount
        string type
        string description
        date date
        boolean isRecurring
        ObjectId aiSuggestedCategory FK
        boolean aiSuggestionAccepted
        string source
        ObjectId recurringTransaction FK
        date recurringOccurrence
        ObjectId importBatch FK
        date deletedAt
        date createdAt
        date updatedAt
    }

    BUDGET {
        ObjectId _id PK
        ObjectId user FK
        ObjectId category FK
        string month
        number limitAmount
        number alertPercentage
        boolean isActive
        date createdAt
        date updatedAt
    }

    RECURRING_TRANSACTION {
        ObjectId _id PK
        ObjectId user FK
        ObjectId category FK
        string type
        number amount
        string description
        string frequency
        date startDate
        date nextOccurrence
        date endDate
        boolean isActive
        date createdAt
        date updatedAt
    }

    INSIGHT {
        ObjectId _id PK
        ObjectId user FK
        string month
        string summaryText
        string tipText
        object flaggedCategories
        string generatedBy
        date generatedAt
        date createdAt
        date updatedAt
    }

    SAVING_TIP {
        ObjectId _id PK
        ObjectId user FK
        string title
        string message
        ObjectId category FK
        number potentialSavings
        number priority
        string source
        boolean isPinned
        boolean isDismissed
        date expiresAt
        date createdAt
        date updatedAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId user FK
        string title
        string message
        string type
        boolean isRead
        string link
        object metadata
        ObjectId createdBy FK
        date createdAt
        date updatedAt
    }

    BOOKMARK {
        ObjectId _id PK
        ObjectId user FK
        string type
        ObjectId referenceId
        string title
        date createdAt
        date updatedAt
    }

    NOTE {
        ObjectId _id PK
        ObjectId user FK
        string referenceType
        ObjectId referenceId
        string content
        date createdAt
        date updatedAt
    }

    AICLASSIFICATION {
        ObjectId _id PK
        ObjectId user FK
        ObjectId transaction FK
        string description
        ObjectId suggestedCategory FK
        number confidence
        ObjectId userSelectedCategory FK
        boolean wasCorrected
        date createdAt
        date updatedAt
    }

    IMPORT_BATCH {
        ObjectId _id PK
        ObjectId user FK
        string fileName
        number totalRows
        number successfulRows
        number failedRows
        number duplicateRows
        string status
        object errors
        array transactionIds
        date createdAt
        date updatedAt
    }

    ACTIVITY_LOG {
        ObjectId _id PK
        ObjectId user FK
        string action
        ObjectId referenceId
        string referenceModel
        object metadata
        date createdAt
        date updatedAt
    }

    ANNOUNCEMENT {
        ObjectId _id PK
        string title
        string message
        string type
        ObjectId createdBy FK
        boolean isActive
        date startDate
        date endDate
        date createdAt
        date updatedAt
    }

    TIP_TEMPLATE {
        ObjectId _id PK
        string title
        string message
        ObjectId category FK
        string triggerType
        number threshold
        boolean isActive
        ObjectId createdBy FK
        date createdAt
        date updatedAt
    }

    PASSWORD_RESET_TOKEN {
        ObjectId _id PK
        ObjectId user FK
        string token UK
        date expiresAt
        boolean used
        date createdAt
        date updatedAt
    }

    SYSTEM_SETTING {
        ObjectId _id PK
        string key UK
        object value
        string description
        ObjectId updatedBy FK
        date createdAt
        date updatedAt
    }

    USER ||--o{ TRANSACTION : "records"
    USER ||--o{ CATEGORY : "creates"
    USER ||--o{ BUDGET : "sets"
    USER ||--o{ RECURRING_TRANSACTION : "defines"
    USER ||--o{ INSIGHT : "receives"
    USER ||--o{ SAVING_TIP : "receives"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ BOOKMARK : "saves"
    USER ||--o{ NOTE : "writes"
    USER ||--o{ AICLASSIFICATION : "generates"
    USER ||--o{ IMPORT_BATCH : "imports"
    USER ||--o{ ACTIVITY_LOG : "produces"
    USER ||--o{ PASSWORD_RESET_TOKEN : "requests"
    USER ||--o{ ANNOUNCEMENT : "publishes"
    USER ||--o{ TIP_TEMPLATE : "authors"
    USER ||--o{ SYSTEM_SETTING : "updates"

    CATEGORY ||--o{ TRANSACTION : "classifies"
    CATEGORY ||--o{ BUDGET : "applies_to"
    CATEGORY ||--o{ RECURRING_TRANSACTION : "classifies"
    CATEGORY ||--o{ SAVING_TIP : "relates_to"
    CATEGORY ||--o{ TIP_TEMPLATE : "relates_to"
    CATEGORY ||--o{ AICLASSIFICATION : "classified_as"

    RECURRING_TRANSACTION ||--o{ TRANSACTION : "materialises"
    IMPORT_BATCH ||--o{ TRANSACTION : "creates"
    TRANSACTION ||--o{ AICLASSIFICATION : "referenced_by"

    TRANSACTION ||--o{ NOTE : "annotated_by"
    SAVING_TIP ||--o{ NOTE : "annotated_by"
    INSIGHT ||--o{ NOTE : "annotated_by"
    SAVING_TIP ||--o{ BOOKMARK : "bookmarked_as"
    INSIGHT ||--o{ BOOKMARK : "bookmarked_as"
```

**Cardinality summary:** one `USER` owns zero-to-many of every user-scoped collection; one `CATEGORY` is referenced by many transactions/budgets/recurring entries; one `RECURRING_TRANSACTION` materialises zero-to-many `TRANSACTION` rows; one `IMPORT_BATCH` creates zero-to-many transactions. `BOOKMARK`/`NOTE` reference tips/insights/transactions **polymorphically** via `referenceId` (application-enforced, no database FK).

---

## 2. Collection reference

Mongoose maps each model to a pluralised collection name; all include `createdAt` / `updatedAt` (schema `timestamps: true`).

| # | Model (file) | Collection | Purpose | Key fields / constraints |
|---|---|---|---|---|
| 1 | `User.js` | `users` | Students and administrators | `email` unique + lowercase; `password` bcrypt hash; `role` enum student/admin; `academicYear`, `monthlyAllowance`, `savingsGoal`, `profileImage`, `isActive`, `lastLogin`; embedded `preferences { darkMode, fontSize }` |
| 2 | `Category.js` | `categories` | Personal + system default categories | `name`, `type` enum income/expense, `isDefault` (system categories, `createdBy: null`), `createdBy` (user's own), `isActive`, `icon` |
| 3 | `Transaction.js` | `transactions` | Income / expense records | `user` + `category` required; `amount ≥ 0`; `type` enum; `description`; `date`; `isRecurring`; `aiSuggestedCategory`; `aiSuggestionAccepted`; `source` enum manual/csv/ai/recurring; `recurringTransaction` + `recurringOccurrence` (idempotent recurring link); `importBatch`; **`deletedAt`** for soft delete/history; indexes `{user,date}`, `{user,deletedAt,date}`, `{user,recurringTransaction,recurringOccurrence}` |
| 4 | `Budget.js` | `budgets` | Monthly per-category budget | `user` + `category` + `month` (`YYYY-MM`) required; `limitAmount ≥ 0`; `alertPercentage` 1–100 (default 80); `isActive` |
| 5 | `RecurringTransaction.js` | `recurringtransactions` | Recurring rules | `user` + `category` required; `type`; `amount`; `frequency` weekly/monthly/yearly; `startDate`, `nextOccurrence`; `endDate`; `isActive` |
| 6 | `Insight.js` | `insights` | AI-style monthly narrative | `user` + `month`; `summaryText`; `tipText`; embedded `flaggedCategories[] { category, categoryName, growthPercentage, message }`; `generatedBy` ai/system; `generatedAt` |
| 7 | `SavingTip.js` | `savingtips` | Personalised saving tips | `user`; `title`, `message`; optional `category`; `potentialSavings`; `priority`; `source` system/ai/template; `isPinned`; `isDismissed`; `expiresAt` |
| 8 | `Notification.js` | `notifications` | In-app notifications | `user`; `title`, `message`; `type` enum budget_warning/budget_exceeded/saving_tip/insight/announcement/system; `isRead`; `link`; `metadata` (Mixed); `createdBy` |
| 9 | `Bookmark.js` | `bookmarks` | Saved tips/insights | `user`; `type` enum saving_tip/insight; `referenceId`; `title` |
| 10 | `Note.js` | `notes` | Notes attached to a record | `user`; `referenceType` enum transaction/saving_tip/insight; `referenceId`; `content` |
| 11 | `AIClassification.js` | `aiclassifications` | AI suggestion + correction learning | `user`; optional `transaction`; `description`; `suggestedCategory` required; `confidence` 0–1; `userSelectedCategory`; `wasCorrected` |
| 12 | `ImportBatch.js` | `importbatches` | CSV import tracking | `user`; `fileName`; `totalRows`, `successfulRows`, `failedRows`, `duplicateRows`; `status` processing/completed/failed; `errors[] {row,message}`; `transactionIds[]` |
| 13 | `ActivityLog.js` | `activitylogs` | Intelligence/audit events | `user`; `action` enum view/create/edit/delete transaction, view_report, create/edit budget, login, logout; `referenceId`; `referenceModel`; `metadata` |
| 14 | `Announcement.js` | `announcements` | Admin broadcast messages | `title`, `message`; `type`; `createdBy`; `isActive`; `startDate`, `endDate` |
| 15 | `TipTemplate.js` | `tiptemplates` | Admin system-wide tip templates | `title`, `message`; optional `category`; `triggerType` enum high_spending/budget_near_limit/budget_exceeded/low_savings/general; `threshold`; `isActive`; `createdBy` |
| 16 | `PasswordResetToken.js` | `passwordresettokens` | Tokenised password reset | `user`; `token` unique; `expiresAt` (1 hour); `used` |
| 17 | `SystemSetting.js` | `systemsettings` | Admin key/value settings | `key` unique; `value` Mixed; `description`; `updatedBy` |

> The SRS §1.8 examples use numeric `INT` keys; Mongoose uses `ObjectId` (`_id`) primary keys and `ObjectId` references. That is a valid design choice (the SRS says its example schema is indicative and may be changed).

---

## 3. Relationship notes

1. **Owner isolation.** Every student-owned collection (`transactions`, `categories` created by students, `budgets`, `recurringtransactions`, `insights`, `savingtips`, `notifications`, `bookmarks`, `notes`, `aiclassifications`, `importbatches`, `activitylogs`, `passwordresettokens`) stores a `user` reference; all controllers filter by the authenticated user, so students never read another student's data.
2. **Default vs personal categories.** System defaults have `isDefault: true` and `createdBy: null` (seeded by `seedCategories.js`). Student categories have `createdBy: <user>`; edit/delete requires ownership and `isDefault === false`.
3. **Transaction history.** `deletedAt` implements soft delete: normal reads filter `deletedAt: null`; the Deleted view reads `deletedAt != null`; restore sets it back to `null`. This satisfies “edits and deletes while retaining the full history”.
4. **Recurring materialisation.** `recurringTransaction` + `recurringOccurrence` on a transaction make generation idempotent — the recurring service checks this pair before inserting, so repeated `/api/recurring/process` or dashboard calls never duplicate an occurrence.
5. **CSV imports.** `ImportBatch.transactionIds` and `Transaction.importBatch` link a batch to the rows it created; `aiSuggestedCategory` records the suggestion used during the CSV review flow.
6. **AI learning.** `AIClassification` stores each suggestion (`suggestedCategory`, `confidence`) and the student's correction (`userSelectedCategory`, `wasCorrected`); the categoriser reads a user's historical corrections before falling back to keyword rules and transaction history.
7. **Tip templates → tips.** Active `TipTemplate` documents are rendered by the tips engine into `SavingTip` rows (`source: "template"`); tips can be pinned/dismissed per student.
8. **Insight flags.** `flaggedCategories` is an embedded array (no separate collection) with an optional `category` reference plus `categoryName` so old insights still render if a category is removed.
9. **Polymorphic references.** `Bookmark.referenceId` and `Note.referenceId` point to either a tip, insight or transaction depending on `type`/`referenceType`; referential integrity is enforced in controllers (ownership checks), not by MongoDB.
10. **Announcements → notifications.** `Announcement` has no notification FK; when created, the controller inserts one `Notification` (`type: "announcement"`) per active student. The relationship is therefore application-level (shown as a note rather than an ERD edge).
11. **Token lifecycle.** `PasswordResetToken` rows are single-use (`used`) and expire after 1 hour; a new request invalidates the user's previous unused tokens. Admin “reset user password” reuses the same token flow.

---

## 4. Schema export / submission note

The SRS asks for SQL scripts or schema files. Because the database is MongoDB, the equivalent “schema files” are the Mongoose model definitions in `backend/models/*.js`. For the submission zip:

- include this ERD document + `backend/models/` as the schema definition (or export each model’s `schema.paths` to JSON with a small one-off script),
- state in the report/ReadMe: “MongoDB was used (allowed by SRS §1.8); collection definitions are the Mongoose schemas in `backend/models/`; no `.sql` script is applicable.”
