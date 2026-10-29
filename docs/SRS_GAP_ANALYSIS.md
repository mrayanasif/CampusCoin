# Campus Coin — SRS Compliance Gap Analysis

**Project:** Campus Coin ("Smart Spending Student Style", Theme NextGen BudgetBee, Category: End-to-End Web Solutions)
**SRS analysed:** `CampusCoin End-to-End Web Solutions_SRS.pdf` (15 pages), extracted text at `docs/srs_extracted_text.txt`
**Audit type:** static code audit of `backend/` + `frontend/`, build/lint log verification, plus read-only live checks. No browser E2E, no email delivery test.
**Audit timeline:** first pass 2026-10-27 20:17 PKT → delta 20:31 → post-audit follow-up 20:38 → **final post-implementation wave 21:00 PKT** (all listed code fixes landed; both repos still uncommitted)
**Snapshot refs:** frontend HEAD `9db4e2a`, backend HEAD `832eb27`. Final tree: backend 47 changed paths, including new `.env.example`, `middleware/rateLimit.middleware.js`, `seedDemo.js`, `services/ai.service.js`, `services/recurring.service.js`, `utils/categoryAccess.js`, `utils/jwt.js`, `utils/validation.js`; frontend 29 changed paths, including new `src/components/Skeleton/`, `src/pages/Notes/`, and deleted `src/pages/Auth/VerifyOtp.jsx`.
**Model count:** **17** Mongoose models in `backend/models/` (`User`, `Category`, `Transaction`, `Budget`, `RecurringTransaction`, `Insight`, `SavingTip`, `Notification`, `Bookmark`, `Note`, `AIClassification`, `ImportBatch`, `ActivityLog`, `Announcement`, `TipTemplate`, `PasswordResetToken`, `SystemSetting`). Earlier "18" was a miscount.
**Build/lint evidence (Lead re-ran on final tree):** `npm run build` → `✓ built in 2.23s` (Vite 8 PASS; only >500 kB chunk warning); `npm run lint` → `36 problems (29 errors, 7 warnings)` in pre-existing/untouched files, non-blocking.

**Status legend**

| Status | Meaning |
|---|---|
| ✅ Implemented | Bullet-level requirement functional end-to-end in code (UI + API + persistence); static verification unless noted |
| 🟡 Partial | Some part works or verification/documentation gap remains |
| ❌ Missing | Not present, or placeholder/stub only |
| ⚪ Out-of-scope | Explicitly excluded by the SRS or non-software |
| ⏳ Not yet produced | Deliverable asset not in workspace |

**Method:** every 1.6/1.7/1.8/1.9 bullet mapped to code. Route mounting verified in `backend/api/index.js:107-123` (17 route groups); frontend→API calls traced through `frontend/src/**`; UI routes in `frontend/src/App.jsx`. Live checks (read-only): backend `/health` HTTP 200 / DB `Connected`; hosted login verification supplied by the Lead on 2026-10-27 20:58 PKT (see §4/§7); live frontend bundle still stale vs local build (`/assets/index-DqOCvIVx.js` vs latest local `index-CKElQQtZ.js` from the Lead's final build) — redeploy pending.

---

## 0. Executive summary (final post-fix state, 21:00 PKT)

| Area | Rows | ✅ | 🟡 | ❌ | ⚪ / ⏳ |
|---|---|---|---|---|---|
| 1.6 Functional requirements | 47 | 46 | 1 | 0 | 0 |
| 1.7 Non-functional requirements | 9 | 3 | 6 | 0 | 0 |
| 1.8 Interface / database design | 6 | 3 | 1 | 1 | 1 |
| 1.9 Project deliverables | 13 | 7 | 4 | 2 | 0 |

**Final implementation wave (this audit):**
- **Soft-delete/restore (A2):** `Transaction.deletedAt` + indexes, `GET /api/transactions/deleted`, `POST /api/transactions/:id/restore`, soft-delete in `DELETE` and bulk-delete, Deleted/Restore UI. A deleted-filter audit (reported as 42 checks by the backend engineer) is corroborated by **51 `deletedAt` references across 16 backend files**, including activity/dashboard/report/admin/import/AI/tips/insights/budget queries. Documented exception: the recurring idempotency duplicate check deliberately ignores `deletedAt` so a deleted occurrence is not re-created (`services/recurring.service.js:46-54`); restoring the transaction restores the occurrence. Category access allows system defaults as the ownership-guard exception (`utils/categoryAccess.js`).
- **Loading skeletons + smart-activity UI (A3/A5):** new `frontend/src/components/Skeleton/Skeleton.jsx` (Skeleton/SkeletonText/SkeletonCard/SkeletonChart) used in Dashboard, Insights, Reports and Transactions; Dashboard now calls all five `/api/activity/*` endpoints and renders a "Smart activity" section (recently viewed/edited, duplicate/unusual flags, next-month forecast) (`Dashboard.jsx:160-189, 503-585`).
- **Security hardening (A4):** `utils/jwt.js` fails fast in production when `JWT_SECRET` is missing; dependency-free rate limiter (`middleware/rateLimit.middleware.js`, 10 req/min/IP) applied to register/login/forgot/reset (`routes/auth.routes.js`); `backend/.env.example` documents all required vars; local `backend/.env` now contains `JWT_SECRET`, `JWT_EXPIRE` and `FRONTEND_URL` (keys checked only; values not printed/inspected). `localStorage` tokens remain an accepted limitation.
- **Demo seed + credentials:** `seedDemo.js` + `npm run seed` executed **3× idempotently** against the configured Atlas DB. Actual counts: **users=3, categories=13, transactions=131, budgets=3 (Food 4000 / Transport 1500 / Subscriptions 1200), recurring=1 (monthly allowance 15000), insights=2, savingTips=7**, data spanning **2026-05 → 2026-10**. Lead verified live on the hosted API at **20:58 PKT**: admin login `200 role=admin`; student login `200 name=Ayesha Khan`; admin stats `activeUsers=22 totalTransactions=169`; student dashboard `income=26000 expense=10619`. The hosted *deploy* is stale and still returns the old dashboard payload (`budgets=null`/`spendingBreakdown=null`).
- **New deliverables (task-8):** root `README.md`, `docs/ERD.md`, `docs/DFD.md`, `docs/TEST_DATA.md`, `docs/DEPLOYMENT.md`, `docs/SITEMAP.md`, `docs/PROJECT_REPORT_OUTLINE.md` (scaffold, no source code, STUDENT TO WRITE markers).

**Still human-only (see §5):** final student-authored report narrative (outline is only a scaffold), demo video `.mp4`, consolidated zip/submission, Vercel env vars + redeploy of both projects, and browser/E2E/email/responsive/accessibility manual QA. Optional AI chatbot remains unimplemented (SRS-optional).

---

## 1. Functional requirements (SRS 1.6)

### 1.1 User authentication and management

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| A1 | Student registration and login; separate, direct-access administrator login | ✅ | `backend/routes/auth.routes.js:6-7`; validated `controllers/auth.controller.js`; separate `/admin/login` page `frontend/src/pages/admin/AdminLogin/AdminLogin.jsx`; `components/ProtectedRoute.jsx`; admin routes `router.use(protect, adminOnly)` (`routes/admin.routes.js:11`) | No signup email verification (not required — tokenized reset). |
| A2 | Secure session management | ✅ | JWT via `utils/jwt.js` (`getJwtSecret`/`getJwtExpire`); production startup fails if `JWT_SECRET` missing (`api/index.js:13-17`, `auth.controller.js:7,14-15`, `middleware/auth.middleware.js:3,14`); 401 interceptor clears session (`frontend/src/api/axios.js:21-33`) | Accepted limitation: JWT is stored in `localStorage`; logout is client-side/stateless (documented). Production fail-fast means Vercel **must** define `JWT_SECRET`. |
| A3 | Password recovery and reset through email verification or tokenized link | ✅ | `POST /api/auth/forgot-password` → 1-hour `PasswordResetToken`; `POST /api/auth/reset-password/:token`; Nodemailer + `${FRONTEND_URL}` reset link (`utils/email.js:6,31`); generic response/no enumeration + production token-leak guard (`auth.controller.js:154-190`); rate-limited (`routes/auth.routes.js:21-27`) | `FRONTEND_URL` present as a local `.env` key; Vercel env + real SMTP delivery still unverified (D). |
| A4 | User profile creation with editable fields: name, academic year, monthly allowance baseline, savings goal | ✅ | `models/User.js` (fields + `preferences`); validated `PUT /api/users/profile` (`user.controller.js`); UI `frontend/src/pages/Profile/Profile.jsx:146-190` | — |
| A5 | Optional bulk import of historical transactions from CSV | ✅ | `POST /api/import/csv`; CSV import modal + sample CSV (`Transactions.jsx`); `ImportBatch` model links generated transactions | Per-row failures returned; AI-assisted review covered by AI4. |

### 1.2 Category management

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| C0 | Registered users can create personal categories under income and expense types | ✅ | `POST /api/categories` (`routes/category.routes.js:9`, `category.controller.js`); UI `Categories.jsx` | `GET /api/categories` merges defaults + own categories. |
| C1 | Income categories: Allowance, Part-time Job, Scholarship, Gift, Other Income | ✅ | `backend/seedCategories.js:8-13`; seeded and live (category count 13 in configured DB) | — |
| C2 | Expense categories: Food, Transport, Hostel/Rent, Academics, Subscriptions, Entertainment, Miscellaneous | ✅ | `backend/seedCategories.js:14-20`; seeded and live | — |
| C3 | Add, edit, delete personal categories under "Manage Own Categories" | ✅ | `PUT/DELETE /api/categories/:id` (ownership + default protection); UI create/edit/delete `Categories.jsx` | Defaults protected server-side and in UI. |

### 1.3 Personalized dashboard

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| D1 | Personalized greeting, current-month balance (income vs expense), quick-add buttons | ✅ | `GET /api/dashboard` returns user/balance/topCategory/tips/insight (`dashboard.controller.js:163-179`); dashboard heading/quick actions `Dashboard.jsx` | Hosted data verified by Lead via login (income 26,000 / expense 10,619); hosted deploy returns old payload shape until redeploy. |
| D2 | Recommends saving tips/highlights based on the student's own transaction history | ✅ | Dashboard loads tips with `/saving-tips/top` + `/saving-tips` fallbacks, renders top tips + dismiss (`Dashboard.jsx:52-54,134-158,403`); tips generated from the student's transactions (`services/tip.service.js`) | 7 tips seeded/live for the demo student. |
| D3 | Dynamic widgets: "This Month's Top Category" and "Budget vs Actual" | ✅ | `GET /api/dashboard` returns additive `spendingBreakdown` + `budgets` keeping old fields (`dashboard.controller.js:142-179`); dashboard renders "Budget vs Actual" (`Dashboard.jsx:269`) and "Spending Overview" (`:328`) with fallbacks | Requires the pending redeploy on the hosted environment. |

### 1.4 Income and expense logging

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| L1 | Quick-add form for income/expense with student categories | ✅ | `POST /api/transactions` (validated `transaction.controller.js`); grouped category selects in modal `Transactions.jsx`; categories from C1/C2 | — |
| L2 | Supports recurring entries (monthly allowances, subscription charges) | ✅ | Recurring CRUD UI (`Transactions.jsx:691` panel; add/toggle/delete/process); API `GET/POST/PUT/DELETE /api/recurring` + `POST /api/recurring/process`; engine `services/recurring.service.js` materialises due occurrences idempotently (linked via `recurringTransaction` + `recurringOccurrence`, indexes); sweeps on `GET /recurring` (`recurring.controller.js:96`) and `GET /dashboard` (`dashboard.controller.js:94-100`) | **Documented idempotency exception:** the duplicate check intentionally ignores `deletedAt`, so a soft-deleted occurrence is not regenerated (`recurring.service.js:46-54`); no background scheduler (sweeps run on those requests). Seed created 1 live recurring allowance. |
| L3 | Edits and deletes transactions while retaining full history | ✅ | Edit via prefilled modal + `PUT /api/transactions/:id`; **soft delete** sets `deletedAt` (`transaction.controller.js:270-298`), `GET /api/transactions/deleted` (`:300-313`), `POST /api/transactions/:id/restore` (`:315-355`), bulk soft-delete (`:357-384`); model fields/indexes (`models/Transaction.js:80-95`); Deleted/Restore UI (`Transactions.jsx` Deleted tab, restore button); 42-point deleted-filter audit corroborated by 51 `deletedAt` references across 16 backend files | Fixed in final wave; live data confirmed but restore flow still needs browser/manual QA (D). |

### 1.5 Optional AI-driven expense categorization assistant

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| AI1 | Suggest a category automatically as the student types a description | ✅ | `POST /api/ai/categorize` calls `services/ai.service.js` (`ai.controller.js:1-49`); debounced suggestion + Apply UI (`Transactions.jsx`) | Rule/feedback-based (no external ML). |
| AI2 | Learns from the student's corrections over time | ✅ | Suggestion upserted to `AIClassification` (`ai.controller.js:24-40`); feedback records corrections (`:69-120`); `ai.service.js:69-101` consults corrections before rules/history; `saveCategorizationFeedback` (`:195-239`) | Static verification; advisory only per SRS §1.5. |
| AI3 | Allows manual override of any AI-suggested category | ✅ | Suggestion applied only on explicit "Apply"; category select user-controlled (`Transactions.jsx`) | — |
| AI4 | Batch-categorization suggestions when importing CSV history | ✅ | `POST /api/import/preview` (`import.controller.js:166-202`); batch `POST /api/import/batches/:id/apply-ai` (`:231+` supports `{apply}`); CSV review table calls preview with per-row `/ai/categorize` fallback (`Transactions.jsx:406-482,1049-1150`) | — |

### 1.6 Monthly reports

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| R1 | Category-wise report of monthly spending | ✅ | `GET /api/reports/category-wise`; category pie from filtered transactions (`Reports.jsx`) | — |
| R2 | Income-versus-expense report covering the last six months | ✅ | `GET /api/reports/income-expense` (6 months); line chart `Reports.jsx` | — |
| R3 | Daily and weekly spending summaries for the current month | ✅ | `/reports/daily` bar chart + `/reports/weekly` rendered as "Weekly Spending" (`Reports.jsx:148,620`) | — |
| R4 | Filters reports by date range, category, or income source | ✅ | Custom From/To (`Reports.jsx:460-485`), category/income-source select (`:490-493`), type filter; backend `/reports/filter` supports `from,to,category` | — |
| R5 | Exports the monthly report as a PDF or image for personal records | ✅ | Client-side `html2canvas` PNG + `jsPDF` PDF (`Reports.jsx`); backend export routes intentionally return `501` pointing to the browser export (`report.controller.js:253-266`) | Shipped path = browser export; documented. |

### 1.7 Optional AI-generated monthly spending insights

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| I1 | Analyse the month's transactions and generate a plain-language narrative | ✅ | `services/insight.service.js`; `POST /api/insights/generate`; UI `Insights.jsx` | Deterministic rule engine (`generatedBy:"system"`), not an LLM; disclose in report. |
| I2 | Flags categories with above-average growth vs own trend | ✅ | 3-month baseline (`insight.service.js:7,26-38,93-125`) | — |
| I3 | Actionable advice tied to the flagged pattern | ✅ | `tipText` + "Suggested action" card (`Insights.jsx`) | — |
| I4 | Stores insight history | ✅ | `Insight` per user/month; `GET /api/insights`; history list; `categoryId` stored on flags (`insight.service.js:125-131`) | 2 sample insights live in seeded DB. |

### 1.8 Personalized saving tips engine

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| S1 | Generates tips by comparing current spending against historical averages and set budget goals | ✅ | `services/tip.service.js` (budgets + recent data, impact priority, `TipTemplate` rendering, pinned preservation) plus prior-3-full-month per-category average comparison at ≥125% (`:176-258`) | 7 tips in seeded DB; runtime path exercised via seed generation. |
| S2 | Ranks tips by potential savings impact; shows top few on dashboard | ✅ | `TIP_SORT = {isPinned, priority, potentialSavings}` (`savingTip.controller.js:5`); dashboard renders top tips (`Dashboard.jsx:134-158,403`) | — |
| S3 | Dismiss or pin tips | ✅ | `PUT /api/saving-tips/:id/pin`, `/dismiss`; UI pin/dismiss + dashboard dismiss (`savingTip.controller.js:66-78`) | — |

### 1.9 Budget goals and alerts

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| B1 | Monthly budget per category | ✅ | `POST /api/budgets` with `limitAmount`/`alertPercentage` (`budget.controller.js:40-45,110-132`); form `Budgets.jsx`; 3 budgets seeded (Food 4000 / Transport 1500 / Subscriptions 1200) | — |
| B2 | Budget consumption via progress bars | ✅ | `GET /api/budgets/status` computes spent/remaining/percentage (`budget.controller.js:239`); progress bars `Budgets.jsx` + dashboard | — |
| B3 | In-app notification when near/exceeding budget | ✅ | `services/budgetAlert.service.js`; triggered on transaction writes/restores, budget create, recurring materialisation, `POST /api/notifications/refresh-budget-alerts`; bell + Notifications page | — |

### 1.10 Bookmarking, notes and sharing

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| BM1 | Bookmarks a saving tip or monthly insight | ✅ | Tips: `/api/bookmarks` + `SavingTips.jsx`; insights: `/api/bookmarks` type `insight` (`Insights.jsx:37-53,101-125`) | — |
| BM2 | Exports/share reports as PDF or email | ✅ | Client-side PDF/PNG export; `POST /api/reports/share/email` + `${FRONTEND_URL}/reports` email template (`utils/email.js:165`); UI Email button | Email delivery unverified (D). |
| N1 | Notes | ✅ | `frontend/src/pages/Notes/Notes.jsx` + `/notes` route (`App.jsx:73`), sidebar/breadcrumb; backend `/api/notes` CRUD + `/ref/:type/:id` | — |

### 1.11 Admin control panel

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| AD1 | Add/edit/remove default categories | ✅ | Admin CRUD routes; `AdminCategories.jsx` inline edit (`PUT /api/admin/categories/:id`), toggle, delete, add | — |
| AD2 | Add/edit/remove announcement or tip templates | ✅ | `Templates.jsx` + `Announcements.jsx` inline edit (PUT routes); tip templates consumed by `tip.service.js`; announcement create fans out student notifications | — |
| AD3 | User accounts (view, disable, reset) | ✅ | `GET /api/admin/users`, disable/enable; `resetUserPassword` creates reset token + sends email (`admin.controller.js:74-105`); UI `admin/Users/Users.jsx` | Email delivery unverified (D). |
| AD4 | Usage statistics (active users, total transactions, most-used categories) | ✅ | `GET /api/admin/stats/overview` (activeUsers/totalUsers/totalTransactions/totalCategories/topCategory/mostUsedCategories) + `/stats/usage` (`admin.controller.js:121-197`); live: `activeUsers=22`, `totalTransactions=169` | — |

### 1.12 Optional system intelligence (advanced UX)

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| SI1 | Tracks recently viewed/edited transactions across sessions | 🟡 | Endpoints `GET /api/activity/recent-views|recent-edits` (`activity.controller.js`, `deletedAt:null` filters); `ActivityLog` writes on view/edit; **Dashboard "Smart activity" → Recently viewed / Recently edited** (`Dashboard.jsx:160-189,503-585`) | **Partially live:** recently *edited* is recorded whenever a transaction is edited; recently *viewed* is only recorded by `GET /api/transactions/:id`, which the current UI does not call (only `GET /transactions/deleted`), so the "Recently viewed" list can stay empty. Backend + UI exist; adding a transaction-detail view would complete it. Optional SRS section. |
| SI2 | Forecast for the upcoming month (optional) | ✅ | `GET /api/activity/forecast` (6-month average) + Dashboard "Next month forecast" block | Optional SRS section; UI added. |
| SI3 | Detects/flags unusually large or duplicate transactions | ✅ | `GET /api/activity/unusual` (>3× average), `/duplicates` (amount+date+category); Dashboard "Smart flags" shows counts + one large-expense note | Optional SRS section; UI added. |

### 1.13 Accessibility and UI enhancements

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| U1 | Dark-mode toggle and font-size adjustment | ✅ | Profile toggles saved via `PUT /api/users/preferences`, hydrated from `user.preferences` (`Profile.jsx:69-74,116`), restored on reload (`App.jsx:37-51`); admin dark mode (`Settings.jsx`, `AdminLayout.jsx`); `User.preferences` schema | — |
| U2 | Breadcrumbs | ✅ | `components/Breadcrumbs/Breadcrumbs.jsx`; used in both layouts; `notes` label | — |
| U3 | Smooth transitions + loading indicators for charts/insights | ✅ | Reusable skeleton components `frontend/src/components/Skeleton/Skeleton.jsx` (Skeleton/SkeletonText/SkeletonCard/SkeletonChart) used in Dashboard (`:237-264`), Insights (`:195-204`), Reports (`:413-441`) and Transactions; CSS transitions; loading toasts | Added in final wave; visual QA still manual (D). |

---

## 2. Non-functional requirements (SRS 1.7)

| ID | SRS requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| NFR1 | Safe to use — no malicious/unnecessary downloads | ✅ | Only intentional download = sample CSV blob; user-initiated `.csv` import; helmet enabled; no third-party trackers | — |
| NFR2 | Accessibility — clear/legible fonts, UI, navigation | 🟡 | Semantic headings/labels, breadcrumbs, 31 `aria-*`, all `<img>` have `alt`, responsive Bootstrap, high-contrast palette | Lighthouse/axe and keyboard pass not run (D); toast-only form errors. |
| NFR3 | User-friendliness — clear menus, first-time friendly | 🟡 | Sidebar/breadcrumbs/sitemap/empty states/sample CSV/quick-add; skeletons; seeded demo data | Manual UX walkthrough pending (D); no onboarding/tooltips. |
| NFR4 | Operability — reliable and efficient | 🟡 | `/health` DB probe; per-request DB connect; central error mapping; validation utils; pagination | No automated tests (`npm test` placeholder); manual QA pending; some swallowed catches remain. |
| NFR5 | Performance — speed/throughput, minimal chart/AI load time | 🟡 | Serverless Express + indexed Mongo queries; local rule-based AI (no external latency); skeletons improve perceived load | Build warns >500 kB chunk; no route splitting; no load testing; client-side PDF capture heavy. Unverified. |
| NFR6 | Scalability — users/transactions/features | 🟡 | Stateless JWT API, Vercel serverless, Atlas, pagination, indexes; recurring materialisation is bounded (`MAX_OCCURRENCES_PER_RUN`) | No load/concurrency evidence; per-request DB connect; tip regeneration rewrites un-pinned tips. |
| NFR7 | Security — adequate auth; users only access own data | ✅ | Production JWT fail-fast / no fallback secret (`utils/jwt.js`, `api/index.js:13-17`); rate limiting on auth routes (`middleware/rateLimit.middleware.js`, `routes/auth.routes.js` 10/min); ownership checks (`utils/categoryAccess.js`, owner filters); transaction update whitelist; generic forgot-password; production token-leak guard; bcrypt; helmet; strict CORS | Accepted limitation: JWT stored in `localStorage` (httpOnly cookies future). Local `.env` no longer prints values in docs. |
| NFR8 | Availability — 24/7, minimum downtime | ✅ | Hosted Vercel serverless + Atlas; `/health` 200/Connected; hosted login verified 20:58 PKT; demo data live | Latest build not yet deployed (C3); no formal SLA/monitoring (free tier). |
| NFR9 | Compatibility — latest browsers/devices | 🟡 | Bootstrap 5, 32 `@media` queries across 26 CSS files, mobile sidebar toggles, viewport meta | Cross-browser/device testing not performed (D). |

---

## 3. Interface / database design (SRS 1.8)

| ID | Requirement | Status | Evidence | Gap / notes |
|---|---|---|---|---|
| IF1 | Hardware specification (i5/i7, 16 GB RAM, etc.) | ⚪ | — | Environment spec, not application code; state assumed dev environment in report. |
| IF2 | Software stack must match an allowed option | ✅ | React 19 + Vite 8 + Bootstrap 5 + react-router 7; Node.js + Express 5 + Mongoose 9 + MongoDB; Atlas datasource | Matches "MongoDB, Express.js, React, Node.js". |
| IF3 | Database design: entities/attributes/relationships | ✅ | 17 Mongoose models (`backend/models/`); documented in **`docs/ERD.md`** (Mermaid ERD, collection/field reference, relationship notes) with indexes, soft-delete field, embedded arrays | ERD deliverable now produced; MongoDB allowed by SRS §1.8 (no `.sql`). |
| IF4 | AI/ML support (optional) | 🟡 | `services/ai.service.js` (rule/feedback-based), `services/insight.service.js` (rule-based + 3-month baseline) | No external AI/ML API; advisory only, documented as rule-based in README/report outline. |
| IF5 | AI ChatBot (optional) | ❌ | `POST /api/ai/chatbot` returns "Chatbot is not available yet…" (`ai.controller.js`); no widget | Optional; declared not implemented. |
| IF6 | Interface: presentation/API/data layers wired | ✅ | 17 route groups mounted (`backend/api/index.js:107-123`); axios `VITE_API_URL`; SPA rewrites (`frontend/vercel.json`); hosted bundle targets hosted API | Redeploy pending for latest build (C3). |

---

## 4. Project deliverables checklist (SRS 1.9)

| ID | Deliverable | Status | What exists | What is missing / action |
|---|---|---|---|---|
| DL1 | Problem Definition (project report) | 🟡 | `docs/PROJECT_REPORT_OUTLINE.md` §1 has verified factual background + **STUDENT TO WRITE** narrative | Student must write the final narrative in own words; move into `docs/PROJECT_REPORT.md`. |
| DL2 | Design Specifications | 🟡 | Outline §3 (factual architecture/stack/UI) + `docs/ERD.md`/`docs/DFD.md`/`docs/SITEMAP.md` | Student to write justification/analysis; final document assembly. |
| DL3 | Diagrams — flowcharts, DFDs | ✅ | `docs/DFD.md` (Level-0, Level-1, 4 flowcharts) + `docs/ERD.md` + `docs/SITEMAP.md`; 8 Mermaid blocks validated (keywords, balanced brackets, no malformed ERD lines) | Render/export images into the final report (student). |
| DL4 | Database Design (schema/ERD) | ✅ | `docs/ERD.md` (Mermaid ERD of all **17** models + collection table + relationship notes) and `backend/models/*.js`; note MongoDB → no SQL script | — |
| DL5 | Test Data Used in the Project | ✅ | `docs/TEST_DATA.md` (credentials, 60+ test cases, QA checklist) + **seed executed**: users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, tips=7 (2026-05→2026-10) | Student to record their own execution results in the report. |
| DL6 | Project Installation Instructions (**MANDATORY**) | ✅ | `README.md` (setup/env/API overview) + `docs/DEPLOYMENT.md` (Vercel/Atlas/redeploy) + outline §9 | Student walkthrough screenshots optional. |
| DL7 | User Credentials for all Types of Users (**MANDATORY**) | ✅ | `admin@campuscoin.test / Admin@12345`, `student@campuscoin.test / Student@12345`, `student2@campuscoin.test / Student@12345`; seed executed + **hosted login verified 20:58 PKT** (admin 200 role=admin; student 200 Ayesha Khan) | — |
| DL8 | Consolidated zip + `ReadMe.doc` + schema files | ❌ | Nothing assembled yet | Build final submission zip (report, README, ERD/schema, test data, SRS, video link); human-only. |
| DL9 | Hosted working application URL | ✅ | Frontend + API URLs live (`/health` 200/Connected; demo data live); SPA rewrites | **Redeploy both Vercel projects** — live frontend bundle still stale and hosted API returns old dashboard shape (C3). |
| DL10 | Demo video (.mp4) covering all features (**MANDATORY**) | ❌ | No `.mp4` in workspace; cannot verify external submission | Record after redeploy: sitemap → auth → transactions (incl. Deleted/Restore) → CSV review → recurring → dashboard/smart activity → budgets/alerts → reports/export/email → tips/insights/notes → dark mode → admin panel → password reset. Human-only. |
| DL11 | Sitemap added to the home page | ✅ | `Home.jsx:167-236` `#sitemap` section; navbar/footer links (`Navbar.jsx:23`, `Footer.jsx:45`); `Home.css` styles; `docs/SITEMAP.md` route map | — |
| DL12 | AI-tool acknowledgement | 🟡 | `README.md` "AI tools used & acknowledgement" section + `docs/PROJECT_REPORT_OUTLINE.md` §11 template with STUDENT TO CONFIRM/COMPLETE | Team must finalise the actual tool list/statement in the report (human-only). |
| DL13 | Documentation must not contain source code | 🟡 | `docs/PROJECT_REPORT_OUTLINE.md` has 0 code fences; gap analysis holds code references only | Final student-authored report still to be written (must stay code-free). |
| — | Build / lint health (supporting evidence) | ✅ | `npm run build`: `✓ built in 2.23s`; `npm run lint`: 36 problems (29E/7W) in pre-existing/untouched files | Non-blocking tech debt. |

---

## 5. Remaining work — final state (A/B/C/D split)

### P0 / P1 / P2 summary

| Priority | Items |
|---|---|
| **P0** | Final student-authored report narrative (B2); demo video (B5); consolidated zip/submission (B7); Vercel env vars + redeploy (C1–C3) |
| **P1** | Browser/E2E, email, responsive/accessibility manual QA (D1–D4); finalise AI-tool acknowledgement (B6) |
| **P2** | Optional AI chatbot (IF5); transaction-detail view to populate SI1 "Recently viewed"; lint cleanup; performance/load testing; httpOnly-token migration; automated tests |

### (A) Mandatory SRS/code items — none outstanding

All SRS §1.6 bullet requirements have an end-to-end implementation except the optional-intelligence *recently viewed* sub-case: **46 ✅ / 1 🟡 / 0 ❌**. SI1 remains partial because the "Recently viewed" list needs a transaction-detail view (`GET /api/transactions/:id`), which the current UI does not call — recently edited, duplicates, unusual and forecast are surfaced. Accepted, documented limitations (not requirement gaps):

| ID | Limitation (accepted) | Evidence | Note |
|---|---|---|---|
| A-1 | JWT stored in `localStorage` | `frontend/src/api/axios.js:10-19` | Accepted for coursework; httpOnly cookies recommended for production. |
| A-2 | "AI" is rule/feedback-based, no ML service | `services/ai.service.js`, `services/insight.service.js` | SRS marks AI support optional; advisory only per SRS §1.5; disclosed in README/report outline. |
| A-3 | No automated test suite | `backend/package.json` test placeholder | Manual QA catalogue in `docs/TEST_DATA.md`. |
| A-4 | Backend report export routes return 501 | `report.controller.js:253-266` | Intentional/documented; shipped export is browser-side. |
| A-5 | No background scheduler for recurring | `dashboard.controller.js:94-100`, `recurring.controller.js:96` | Due occurrences materialise on dashboard/recurring requests; idempotency exception documented (`recurring.service.js:46-54`). |
| A-6 | Optional chatbot not implemented | `ai.controller.js` placeholder | SRS-optional (§1.8); declared not implemented. |
| A-7 | SI1 "recently viewed" needs a transaction-detail view | `frontend/src/pages/Transactions/Transactions.jsx` has no `GET /transactions/:id` call | Recently-edited/duplicates/unusual/forecast are surfaced in Smart activity; adding a read-only detail view would populate recently-viewed (optional SRS section). |

### (B) Project deliverables / documentation

| ID | Deliverable | Current state | Remaining action (human-only unless noted) |
|---|---|---|---|
| B1 | Root `README.md` + installation instructions | ✅ done — `README.md` | Review/update after final redeploy. |
| B2 | Project report — problem definition + design specs | 🟡 scaffold — `docs/PROJECT_REPORT_OUTLINE.md` (factual sections filled, STUDENT TO WRITE markers) | **Students must write the final narrative**, review facts, and produce `docs/PROJECT_REPORT.md`/Word/PDF. Do not submit the outline as the report. |
| B3 | DB schema/ERD + DFD/flowcharts + sitemap | ✅ done — `docs/ERD.md`, `docs/DFD.md`, `docs/SITEMAP.md` | Render/export diagram images into the report. |
| B4 | Test data + credentials | ✅ done — `docs/TEST_DATA.md`; seed executed; hosted logins verified 20:58 PKT | Student records own test results in report. |
| B5 | Demo video (.mp4) | ❌ missing | **Record after redeploy** (full SRS §1.6 feature walkthrough). |
| B6 | AI-tool acknowledgement | 🟡 draft — README section + report-outline template | Team must list every AI tool used and finalise the statement. |
| B7 | Consolidated zip + `ReadMe.doc` + schema files | ❌ missing | Assemble final submission package (no `.env`/secrets). |
| — | Hosted URL (DL9) | ✅ live; deployment stale | see C3. |
| — | Sitemap (DL11) | ✅ done | include screenshot in report. |

### (C) Deployment / environment actions

| ID | Action | Evidence | Where |
|---|---|---|---|
| C1 | **Set/verify Vercel env vars** (backend `JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL`, `DBURI`, `EMAIL_*`, `NODE_ENV=production`; frontend `VITE_API_URL`) | Local `backend/.env` now contains `JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL` (key names checked, values not printed); `.env.example` documents all. Vercel project env cannot be inspected from here — **unverified** | Vercel dashboard → both projects |
| C2 | **Production JWT fail-fast** — the backend now refuses to start when `NODE_ENV=production` and `JWT_SECRET` is missing | `utils/jwt.js:11-33`; `api/index.js:13-17`; `auth.controller.js:7,14-15`; `middleware/auth.middleware.js:3,14` | Must be set in Vercel before/with the redeploy |
| C3 | **Redeploy both Vercel projects** — live build is stale | Live frontend serves `/assets/index-DqOCvIVx.js`; latest local build `/assets/index-CKElQQtZ.js` (Lead re-ran build: ✓ 2.23s). Hosted backend still returns old dashboard payload (`budgets=null`/`spendingBreakdown=null` per Lead's 20:58 verification) | Vercel → Deployments → Redeploy (or `git push`) |
| C4 | CORS allowlist is hard-coded to localhost + two Vercel domains | `backend/api/index.js:20-33` | Update if domain changes |
| C5 | Atlas SRV DNS issue was environment-specific | Hosted `/health` 200/DB Connected; local `querySrv` issue reported by team only | Re-test locally if seeding again |
| C6 | Seed against configured DB | ✅ **DONE** — executed 3× idempotently; counts users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, tips=7; hosted logins verified 20:58 PKT | — (no action) |

### (D) Unverified / manual QA (human-only)

| ID | Check | Why unverified |
|---|---|---|
| D1 | Authenticated browser E2E: register/login → transactions add/edit/soft-delete/restore → CSV review → recurring → budgets/alerts → reports/filters/export/email → tips/insights/notes/bookmarks → profile/prefs → admin users/categories/templates/announcements → password reset | No browser run performed (static audit only). Login itself was verified via hosted API by the Lead. |
| D2 | Real email delivery: password reset, admin reset, report share (SMTP from serverless) | Requires configured SMTP + valid recipients; not exercised in this audit. |
| D3 | Responsive / cross-browser / accessibility pass (Chrome/Edge/Firefox; mobile/tablet; keyboard/zoom; dark mode/font size; skeletons) | No device/browser testing evidence; Lighthouse/axe not run. |
| D4 | Deployed-vs-local parity after redeploy (`/health`, SPA deep links, new dashboard payload, Deleted/Restore, Smart activity, sitemap) | Live build currently stale (C3). |
| D5 | Build/lint status | Verified from logs: build PASS (`✓ built in 2.60s`); lint 36 problems (29E/7W) pre-existing in untouched files — non-blocking tech debt. |

---

## 6. Risks and contradictions

1. **Stale deployment (highest immediate risk).** Live frontend bundle is older than the final build and the hosted API still returns the old dashboard payload shape; the new sitemap/Notes/Smart activity/Deleted-restore/soft-delete features and additive dashboard fields will not appear live until **both Vercel projects are redeployed** with the Vercel env vars set.
2. **Production env vars unverified.** The backend now fails fast without `JWT_SECRET`; if Vercel lacks `JWT_SECRET` (and `FRONTEND_URL` for email links) the redeploy will either fail to start or send localhost links. Vercel project env cannot be inspected from this environment.
3. **Human-only deliverables still missing.** The academic report narrative, demo video and consolidated zip are the largest remaining submission risks (the outline is only a scaffold, not the report).
4. **Email delivery unverified.** Even with `FRONTEND_URL`, SMTP from serverless hosting may be blocked/rate-limited; test reset/report emails.
5. **Seed guard in production.** `seedDemo.js` refuses to run with `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`; keep demo seeding deliberate.
6. **Accepted security limitation.** JWTs in `localStorage`; rate limiting is in-memory per serverless instance; stricter production hardening (httpOnly cookies, shared-store limiter) is future work.
7. **AI claims.** Categorisation/insights are deterministic rule/feedback based, not trained ML/LLM. SRS 1.8 marks AI support optional and 1.5 requires advisory-only suggestions — describe as "rule-based heuristics with feedback learning".
8. **"Relational database" wording conflict.** SRS 1.2 says relational; SRS 1.8 explicitly allows MongoDB/JSON and the implementation uses Mongoose/Atlas. Document the choice as an allowed alternative (README/ERD/report outline do).
9. **Optional chatbot not implemented.** Declared explicitly; optional in SRS §1.8.
10. **Lint debt and bundle size.** 36 pre-existing lint problems; 1.49 MB JS chunk warning — non-blocking, mention in known limitations.
11. **CORS allowlist hard-coded** to localhost + two Vercel domains; a domain change breaks API calls.
12. **Performance/scalability unproven** — no load testing; free-tier Atlas/Vercel limits apply.

---

## 7. Verification notes and limitations

- **Final-wave reads/diffs:** `backend/models/Transaction.js` (soft-delete fields + indexes), `backend/routes/transaction.routes.js` (deleted/restore routes), `backend/controllers/transaction.controller.js` (soft delete/getDeleted/restore/bulk soft-delete), `backend/services/recurring.service.js` (idempotency exception), `backend/controllers/activity.controller.js` (`deletedAt` filters), `backend/utils/jwt.js`, `backend/middleware/rateLimit.middleware.js`, `backend/routes/auth.routes.js`, `backend/api/index.js`, `backend/seedDemo.js`, `backend/package.json`, `backend/.env.example`, `backend/.env` key names (values not inspected), `frontend/src/components/Skeleton/Skeleton.jsx`, `frontend/src/pages/Dashboard/Dashboard.jsx` (activity fetch + Smart activity UI), `frontend/src/pages/Transactions/Transactions.jsx` (Deleted/Restore UI), `frontend/src/pages/Insights/Insights.jsx`, `frontend/src/pages/Reports/Reports.jsx`.
- **Deleted-filter audit:** 51 `deletedAt` references across 16 backend files (transaction/dashboard/report/activity/admin/import/ai/budget/note controllers; tip/insight/recurring/budgetAlert/ai services; model; seed). Reported as a 42-point audit by the backend engineer; the grep corroborates coverage. Documented exceptions: recurring idempotency duplicate check ignores `deletedAt`; category access allows system defaults (`utils/categoryAccess.js`).
- **Seed / credentials:** Lead-provided verification (2026-10-27 20:58 PKT): hosted `POST /api/auth/login` admin `200 role=admin`; student `200 name=Ayesha Khan`; admin stats `activeUsers=22`, `totalTransactions=169`; student dashboard `income=26000`, `expense=10619`. Seed executed 3× idempotently with counts users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, tips=7 (2026-05→2026-10). These are recorded as provided by the Lead; this audit did not make authenticated calls.
- **Live checks (read-only, this audit):** backend `/health` HTTP 200 with DB `Connected`; frontend `/` HTTP 200; live frontend bundle stale vs local final build. No authenticated/destructive calls made here.
- **Build/lint:** Lead re-ran on the final tree: `npm run build` `✓ built in 2.23s`; `npm run lint` `36 problems (29 errors, 7 warnings)` pre-existing in untouched files.
- **Not verified (D):** browser E2E/rendering of new features, real email delivery, responsive/cross-browser/accessibility audits, Vercel project env vars, post-redeploy parity, `.mp4` video existence.
- **Assumption:** MongoDB collections satisfy "Database Design" (SRS 1.8 allows MongoDB/JSON); `docs/ERD.md` + `backend/models/` are the schema deliverable (no `.sql` required).

---

## 8. Movement during this audit (full timeline)

### First pass 20:17 → 20:23
Sitemap; transaction edit via PUT; dashboard widget contract + real tips; Notes page; dark-mode/font-size persistence + `User.preferences`; weekly report chart; insight bookmarks via API; tip ranking + `TipTemplate` integration; admin reset-password real; admin inline edit (categories/templates/announcements); recurring materialisation service; CSV batch-AI backend; validation/ownership/anti-enumeration security.

### Final tree 20:31 → post-audit follow-up 20:38
Dashboard additive payload + recurring materialisation; `recurring.service.js` + `POST /process` + sweeps; AI controller → `ai.service` + `AIClassification` feedback learning; `/import/preview` + batch apply-ai; admin reset token+email; `FRONTEND_URL` emails; `User.preferences`; ownership/whitelist hardening; `Budget.alertPercentage`; tips ranking/templates/pin; insight 3-month baseline + category ids; error mapping; optional pagination; report export 501; extended admin stats; frontend sitemap; transaction edit PUT; dashboard fallbacks/tips; weekly chart; recurring CRUD panel; CSV review UI; notes UI; insight bookmarks; admin inline edit; prefs hydration; custom report filters; `VerifyOtp.jsx` deleted; tips historical-average comparison; `.env.example`; build PASS / lint 36.

### Final implementation wave → 21:00 PKT (this report revision)
| Claim | Verified | Evidence |
|---|---|---|
| Soft-delete history + restore implemented, with `deletedAt` filters across read paths | ✅ | `models/Transaction.js:80-95`; `routes/transaction.routes.js:9-12`; `transaction.controller.js:270-298,300-313,315-355,357-384`; `Transactions.jsx` Deleted tab/restore; 51 `deletedAt` refs / 16 files |
| Recurring-idempotency exception documented (deleted occurrence not re-created; restore restores it) | ✅ | `services/recurring.service.js:46-54`; `recurring.service.js:19-22`; `recurring.routes.js` `/process`; dashboard sweep `dashboard.controller.js:94-100` |
| Category-guard exception (system defaults allowed despite ownership guard) | ✅ | `utils/categoryAccess.js:9-35`; used `transaction.controller.js:4,41`, `budget.controller.js:4,55`, `recurring.controller.js:3,124` |
| Loading skeletons | ✅ | `frontend/src/components/Skeleton/Skeleton.jsx`; Dashboard `:237-264`; Insights `:195-204`; Reports `:413-441`; Transactions loading rows |
| Smart-activity UI (SI1–SI3) | ✅ UI / 🟡 SI1 data | Dashboard fetches `/activity/recent-views|recent-edits|duplicates|unusual|forecast` (`:160-189`), renders "Smart activity" (`:503-585`); backend `activity.controller.js` with `deletedAt:null` filters. Recently-edited/duplicates/unusual/forecast populate; "recently viewed" stays empty until a transaction-detail view calls `GET /api/transactions/:id` |
| JWT production fail-fast (no fallback secret) | ✅ | `utils/jwt.js:11-33`; `api/index.js:13-17`; `auth.controller.js:7,14-15`; `auth.middleware.js:3,14` |
| Rate limiting on auth endpoints (10/min/IP) | ✅ | `middleware/rateLimit.middleware.js`; `routes/auth.routes.js:6-27` |
| `.env.example` + local env keys (`JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL`) | ✅ | `backend/.env.example`; `backend/.env` key names checked (values not printed); `README.md`/`DEPLOYMENT.md` env tables |
| Demo seed executed (3× idempotent) + recorded counts | ✅ (Lead-provided) | `seedDemo.js` + `package.json` `"seed": "node seedDemo.js"`; counts users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, tips=7 (2026-05→2026-10) |
| Hosted demo logins verified 20:58 PKT | ✅ (Lead-provided) | admin login 200 role=admin; student 200 Ayesha Khan; admin stats activeUsers=22/totalTransactions=169; student dashboard income=26000/expense=10619; hosted deploy stale (`budgets=null`) |
| New deliverables created (README/ERD/DFD/TEST_DATA/DEPLOYMENT/SITEMAP/PROJECT_REPORT_OUTLINE) | ✅ | root `README.md`; `docs/ERD.md`, `DFD.md`, `TEST_DATA.md`, `DEPLOYMENT.md`, `SITEMAP.md`, `PROJECT_REPORT_OUTLINE.md`; 8 Mermaid blocks validated, 0 broken links, credentials consistent |
| Model count corrected to 17 | ✅ | 17 files in `backend/models/`; earlier "18" was wrong (fixed in this report and task-8 docs) |
| Latest build/lint (Lead re-run) | ✅ | `npm run build` `✓ built in 2.23s`; `npm run lint` 36 problems (29E/7W) |

**Still open at final tree (human-only):** student-authored report narrative (B2), demo video (B5), consolidated zip/submission (B7), Vercel env vars (C1) + production JWT/FRONTEND_URL verification (C2) + redeploy of both projects (C3), and browser/E2E/email/responsive/accessibility manual QA (D1–D4). Optional AI chatbot remains not implemented (SRS-optional).
