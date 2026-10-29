# Campus Coin — Test Data, Demo Credentials & QA Checklist

**Purpose:** everything a evaluator/student needs to log in, seed demo data, exercise the SRS §1.6 features and verify the system manually.

> **Verification status — SEED EXECUTED, CREDENTIALS LIVE (2026-10-27 20:58 PKT):** the backend engineer ran `npm run seed` three times (idempotent) against the configured Atlas database, and the Lead verified the credentials against the hosted API: admin login → `200` (`role=admin`), student login → `200` (`name=Ayesha Khan`). Details and counts are in §2.2. Browser E2E, real email delivery, responsive/accessibility and demo-video checks remain **NOT RUN** — see the QA checklist in §4.

---

## 1. Demo credentials (agreed values)

| Role | Email | Password | Where to log in |
|---|---|---|---|
| Administrator | `admin@campuscoin.test` | `Admin@12345` | `https://sfc-mindforge-frontend.vercel.app/admin/login` (local: `http://localhost:5173/admin/login`) |
| Student 1 (main demo) | `student@campuscoin.test` | `Student@12345` | `/login` |
| Student 2 (isolation checks) | `student2@campuscoin.test` | `Student@12345` | `/login` |

Rules: passwords are hashed with bcrypt in the database; demo accounts must never contain real personal data; these credentials are for coursework evaluation only. Do not reuse them in production.

---

## 2. Seed data

### 2.1 How to seed

```powershell
cd backend
# .env must point DBURI at the target database (local or Atlas)
npm run seed
```

The script is **idempotent** and only deletes/recreates data owned by the three demo accounts, so it is safe to re-run. Safety guard: if `NODE_ENV=production`, it refuses to run unless `ALLOW_DEMO_SEED=true` is set (normally you seed from a local shell with `NODE_ENV` unset and the production `DBURI`). It prints a summary with user emails, counts and the covered month range.

**Status: EXECUTED** — the script was run three times by the backend engineer against the configured Atlas database without duplication; see §2.2 for the resulting counts and the hosted-login verification.

Manual fallback (only if the script cannot be used):

1. `node seedCategories.js` — creates the 12 default categories (5 income + 7 expense, `isDefault: true`).
2. Register the two students through `POST /api/auth/register` (or the UI) using the credentials in §1.
3. Create the admin account directly in MongoDB (register via API, then set `role: "admin"` on the `users` document) or use the seed script once available.
4. Insert demo transactions/budgets/recurring rows as described in §2.2 (MongoDB Compass or `mongosh`), or simply add 5–10 transactions through the UI for a quick smoke demo.

> Never commit `.env` or real credentials. The seed script must read `DBURI` from the environment.

### 2.2 Actual seeded contents (verified in the configured database)

| Data | Actual |
|---|---|
| Users | 3: `admin@campuscoin.test` (role admin), `student@campuscoin.test` (Ayesha Khan, demo data), `student2@campuscoin.test` (login-only for isolation checks) |
| Categories | 13 in the configured DB (the script ensures the 12 system defaults exist: 5 income, 7 expense; the seeded DB reports 13 categories) |
| Transactions | **131** demo transactions for `student@campuscoin.test`, spanning **2026-05 → 2026-10** (6 months) |
| Budgets | **3** current-month budgets: **Food 4,000**, **Transport 1,500**, **Subscriptions 1,200** (`alertPercentage: 80`) |
| Recurring | **1** active monthly **Allowance** income rule (15,000), `nextOccurrence` = first day of next month |
| Insights | **2** stored monthly insights (previous and two months ago) with flagged categories (Food +28%, Subscriptions +22%) |
| Tips | **7** saving tips pre-generated for the demo student (`generateTipsForUser`) |
| Admin content | Optional/manual: tip templates and announcements (announcement creation notifies students) |

**Hosted verification (Lead, 2026-10-27 20:58 PKT):**

| Check | Result |
|---|---|
| `POST https://sfc-mindforge-backend.vercel.app/api/auth/login` — admin | `200`, `role=admin` |
| Same endpoint — student | `200`, `name=Ayesha Khan` |
| `GET /api/admin/stats/overview` (admin) | `activeUsers=22`, `totalTransactions=169` |
| Student dashboard (hosted) | `income=26000`, `expense=10619` (the hosted deploy is stale, so it still returns the old dashboard shape with `budgets=null` / `spendingBreakdown=null`; the data itself is live) |

The script prints a summary such as `Counts: users=3 categories=13 transactions=131 budgets=3 recurring=1 insights=2 savingTips=7` and the covered month range. Re-running it resets only those three demo accounts' data.

### 2.3 Sample CSV for bulk import

Use this for the Transactions → **Import CSV** flow (or the UI’s “Download Sample CSV” button):

```csv
date,category,amount,type,description
2026-09-01,Food,450,expense,Lunch at campus canteen
2026-09-02,Transport,120,expense,Metro card top-up
2026-09-03,Allowance,15000,income,Monthly allowance
2026-09-04,Academics,800,expense,Textbook purchase
2026-09-05,Subscriptions,199,expense,Streaming subscription
```

Expected: `/api/import/preview` returns per-row category suggestions; the review table lets you accept/override each row; import reports successful/failed row counts and stores an `ImportBatch`.

---

## 3. Test cases

**Status legend:** `NOT RUN` = must be executed manually (no automated test suite exists yet); `PASS`/`FAIL` to be filled by the tester. All expected results below are derived from the current implementation.

### 3.1 Authentication & session

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-AUTH-01 | Register a new student with valid name/email/password (≥ 6 chars) | `201`, JWT returned, redirected to `/login`; user stored in `users` | NOT RUN |
| TC-AUTH-02 | Register with an existing email | `400` “Email already registered” | NOT RUN |
| TC-AUTH-03 | Register with password < 6 chars / invalid email | `400` validation message | NOT RUN |
| TC-AUTH-04 | Student login with correct credentials | `200`, JWT stored, redirects to `/dashboard` | NOT RUN |
| TC-AUTH-05 | Admin login at `/admin/login` with admin credentials | `200`, redirects to `/admin/dashboard`; student account on admin page shows “Access denied” | NOT RUN |
| TC-AUTH-06 | Login with wrong password | `401` “Invalid credentials”, stays on login | NOT RUN |
| TC-AUTH-07 | Call any protected API without token (e.g. `GET /api/transactions`) | `401` “Not authorized, no token” | NOT RUN |
| TC-AUTH-08 | Student JWT calls `GET /api/admin/users` | `403` “Admin access only” | NOT RUN |
| TC-AUTH-09 | Forgot password with known/unknown email | Both return generic success message (no user enumeration); email sent when SMTP configured | NOT RUN |
| TC-AUTH-10 | Reset password with the emailed token | `200`, password changed, token marked used, old password rejected | NOT RUN |
| TC-AUTH-11 | Reuse the same reset token, or use an expired token | `400` “Invalid or expired token” | NOT RUN |
| TC-AUTH-12 | Change password while logged in (`PUT /api/auth/change-password`) | `200`; old password no longer works | NOT RUN |
| TC-AUTH-13 | Logout | Client token cleared; protected API calls now `401` | NOT RUN |
| TC-AUTH-14 | Disable a user (admin) then log in as that user | `401` “Invalid credentials” (inactive user cannot log in) | NOT RUN |

### 3.2 Profile & accessibility preferences

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-PROF-01 | View profile → values pre-filled (name, academic year, allowance, savings goal) | `GET /api/users/profile` `200` | NOT RUN |
| TC-PROF-02 | Update profile with valid values | `200`, values persist after reload | NOT RUN |
| TC-PROF-03 | Update allowance/savings goal to a negative number | `400` validation | NOT RUN |
| TC-PROF-04 | Toggle dark mode + change font size, reload the page | Settings persist (server `users.preferences` + `localStorage`) and remain applied | NOT RUN |
| TC-PROF-05 | Zoom/keyboard-only navigation on profile | All controls reachable with Tab/Enter, visible focus | NOT RUN |

### 3.3 Categories

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-CAT-01 | Open `/categories` with a seeded account | 5 income + 7 expense defaults listed (system defaults marked) | NOT RUN |
| TC-CAT-02 | Create personal expense category “Gym” | `201`, appears in list and transaction category dropdown | NOT RUN |
| TC-CAT-03 | Edit own category name/type | `200`, updated in list and dropdowns | NOT RUN |
| TC-CAT-04 | Delete own category | `200`, removed from list/dropdown | NOT RUN |
| TC-CAT-05 | Attempt to edit/delete a default category | `403` “Cannot edit/delete default” (UI hides the buttons too) | NOT RUN |
| TC-CAT-06 | Student 2 requests Student 1's private category by id (`GET /api/categories/:id`) | `404` (no cross-account leakage) | NOT RUN |

### 3.4 Transactions, history (soft delete/restore)

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-TXN-01 | Add an expense (category, amount, date, description) | `201`; appears in list, dashboard and reports | NOT RUN |
| TC-TXN-02 | Add income | `201`; balance/income totals update | NOT RUN |
| TC-TXN-03 | Submit amount ≤ 0 / missing category / missing date | `400` validation; UI toast | NOT RUN |
| TC-TXN-04 | Edit an existing transaction (change amount/description/category/date) | `200`; list/reports update; edit recorded in `activitylogs` | NOT RUN |
| TC-TXN-05 | Delete a transaction, then open the **Deleted** tab | Deleted row disappears from active list; appears under Deleted; excluded from dashboard/reports/budgets/insights | NOT RUN |
| TC-TXN-06 | Restore a soft-deleted transaction | Reappears in active list; totals/reports/budget alerts update | NOT RUN |
| TC-TXN-07 | Direct API checks: `GET /api/transactions/deleted`, `POST /api/transactions/:id/restore` | Deleted list and restore work only for the owner (`404` for others) | NOT RUN |
| TC-TXN-08 | Bulk delete (`POST /api/transactions/bulk-delete` with ids) | Soft-deletes up to 200 rows; returns modified count | NOT RUN |
| TC-TXN-09 | Pagination: `GET /api/transactions?page=2&limit=5` | Returns `page`, `limit`, `pages`, `count`/`transactions` | NOT RUN |
| TC-TXN-10 | Student 2 tries to edit/delete Student 1's transaction id | `404` (owner-scoped query) | NOT RUN |

### 3.5 Recurring transactions

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-REC-01 | Create recurring monthly expense with a start date | `201`, item listed in Recurring panel | NOT RUN |
| TC-REC-02 | Click process / load page when `nextOccurrence` is due | A transaction is materialised once (source recurring) and `nextOccurrence` advances | NOT RUN |
| TC-REC-03 | Trigger `/api/recurring/process` twice | Second run creates no duplicate (idempotent via `recurringTransaction` + `recurringOccurrence`) | NOT RUN |
| TC-REC-04 | Pause/resume a recurring rule | `isActive` toggles; paused rule no longer materialises | NOT RUN |
| TC-REC-05 | Delete a recurring rule | `200`; rule removed; already-materialised transactions remain | NOT RUN |

### 3.6 CSV import & AI categorisation

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-CSV-01 | Upload the sample CSV from §2.3 | Preview table with rows + suggested categories (backend `/import/preview`; per-row fallback if unavailable) | NOT RUN |
| TC-CSV-02 | Accept suggestions and import | Transactions created with `source: csv`; batch summary shows successful/failed counts | NOT RUN |
| TC-CSV-03 | Import a CSV with an unknown category and no override | Row fails; batch reports the error row | NOT RUN |
| TC-CSV-04 | Upload a non-`.csv` file | UI rejects with “Please upload a .csv file” | NOT RUN |
| TC-AI-01 | Type a description such as “Lunch at campus cafe” in Add Transaction | Suggestion appears (e.g. Food) and can be applied or ignored | NOT RUN |
| TC-AI-02 | Override an AI suggestion manually | Chosen category is saved; feedback call records the correction | NOT RUN |
| TC-AI-03 | Repeat a corrected description later | Suggestion reflects the student's earlier correction (learning from feedback) | NOT RUN |
| TC-AI-04 | `POST /api/import/batches/:id/apply-ai` with `{apply: true}` | Rows without an accepted suggestion are re-categorised; batch response reports applied count | NOT RUN |

### 3.7 Budgets & alerts

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-BUD-01 | Create a budget for Food, current month, limit 1000 | `201`, listed with 0% progress | NOT RUN |
| TC-BUD-02 | Add Food expenses totalling 85% of the limit | Status “near limit” / warning colour | NOT RUN |
| TC-BUD-03 | Add spending so the limit is exceeded | Status “over limit”; in-app notification `budget_exceeded`; bell badge increments | NOT RUN |
| TC-BUD-04 | Call `POST /api/notifications/refresh-budget-alerts` | Recomputes alerts for all current-month budgets | NOT RUN |
| TC-BUD-05 | Delete budget | `200`; removed from Budgets page and dashboard widget | NOT RUN |
| TC-BUD-06 | Update budget limit/`alertPercentage` (API) | Status recalculates using the custom alert threshold | NOT RUN |

### 3.8 Reports, export & email

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-REP-01 | Open `/reports` | Category pie, 6-month income-vs-expense line, daily bars, weekly chart render for seeded data | NOT RUN |
| TC-REP-02 | Filter by custom From/To dates | Charts/totals recompute to the selected range | NOT RUN |
| TC-REP-03 | Filter by category / income source and by type | Results reflect the filter; “All” resets | NOT RUN |
| TC-REP-04 | Export PDF | Browser downloads `campus-coin-report-<date>.pdf` | NOT RUN |
| TC-REP-05 | Export image | Browser downloads `campus-coin-report-<date>.png` | NOT RUN |
| TC-REP-06 | Email report (`POST /api/reports/share/email`) with SMTP configured | `200` “Report sent…”, email received (requires `FRONTEND_URL`/SMTP) | NOT RUN |
| TC-REP-07 | Server export routes `GET /api/reports/export/pdf` / `image` | `501` with message pointing to the browser export (expected, documented) | NOT RUN |

### 3.9 AI-style insights

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-INS-01 | Generate insight with current-month transactions | Narrative summary + top category + actionable tip; saved in history | NOT RUN |
| TC-INS-02 | Generate with no current-month transactions | `400` “No transactions this month…” message | NOT RUN |
| TC-INS-03 | Seed a category with large month-over-month growth and regenerate | Flagged category with growth % vs 3-month baseline | NOT RUN |
| TC-INS-04 | Reload `/insights` | Past months' insights listed; delete works | NOT RUN |

### 3.10 Saving tips

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-TIP-01 | Open `/saving-tips` with transactions | Tips generated, ranked by impact; top tips also on dashboard | NOT RUN |
| TC-TIP-02 | Pin a tip | Moves to top, pin icon toggles, persists | NOT RUN |
| TC-TIP-03 | Dismiss a tip | Removed from list; dashboard dismiss works too | NOT RUN |
| TC-TIP-04 | Bookmark a tip | Bookmark icon active; “Bookmarked” filter shows it | NOT RUN |
| TC-TIP-05 | Admin creates an active tip template, then student regenerates tips | Template-based tip appears (`source: template`) | NOT RUN |

### 3.11 Bookmarks & notes

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-BM-01 | Bookmark an insight on `/insights` | Saved server-side (`bookmarks` type `insight`); survives reload | NOT RUN |
| TC-BM-02 | Bookmark the same item twice via API | `400` “Already bookmarked” | NOT RUN |
| TC-NOTE-01 | Create a note attached to a transaction/tip/insight | `201`, visible on `/notes` with reference label | NOT RUN |
| TC-NOTE-02 | Edit and delete own note | `200`; changes/removal persist | NOT RUN |
| TC-NOTE-03 | Student 2 tries to edit/delete Student 1's note | `404` (owner-scoped) | NOT RUN |

### 3.12 Admin panel

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-ADM-01 | Admin dashboard + statistics | Active users, total users/transactions/categories, most-used categories, monthly usage chart | NOT RUN |
| TC-ADM-02 | Disable a student, then enable | Student cannot log in while disabled; re-enabled login works | NOT RUN |
| TC-ADM-03 | Reset a student's password | Reset token created + email sent; student can set a new password | NOT RUN |
| TC-ADM-04 | Add/edit/delete/toggle default category | New category appears for all students; delete removes it | NOT RUN |
| TC-ADM-05 | Add/edit/delete/toggle tip template | Changes persist; active templates influence tips | NOT RUN |
| TC-ADM-06 | Create announcement | Announcement listed; every active student receives an `announcement` notification | NOT RUN |
| TC-ADM-07 | Admin settings CRUD | Create/edit/delete key/value settings | NOT RUN |
| TC-ADM-08 | Student session opens `/admin/users` | Redirected to student dashboard (frontend guard) and API returns `403` | NOT RUN |

### 3.13 Dashboard, health & sitemap

| ID | Test | Expected result | Status |
|---|---|---|---|
| TC-DASH-01 | Student dashboard with seeded data | Greeting, income/expense/balance, top category, budget-vs-actual bars, spending chart, top tips | NOT RUN |
| TC-DASH-02 | `GET /api/dashboard` response shape | Includes `balance`, `topCategory`, `tips`, `insight`, `spendingBreakdown`, `budgets` (additive, old fields kept) | NOT RUN |
| TC-HEALTH-01 | `GET /health` (local + hosted) | `200` with `"database": {"status": "Connected"}` | NOT RUN |
| TC-UI-01 | Home page sitemap | `#sitemap` section lists public/student/admin pages; navbar & footer “Sitemap” links scroll to it | NOT RUN |
| TC-UI-02 | Unknown URL (e.g. `/does-not-exist`) | Redirects to `/` | NOT RUN |
| TC-UI-03 | Breadcrumbs on student/admin pages | Correct trail, links navigate | NOT RUN |
| TC-UI-04 | Loading states | Skeletons/spinners while transactions, dashboard and reports load | NOT RUN |

---

## 4. Manual QA checklist (before submission)

### 4.1 Browser / E2E (student)

- [ ] Register → login → dashboard loads.
- [ ] Add income + expense; edit one; delete one; view Deleted tab; restore it.
- [ ] CSV import with the sample file: preview suggestions → accept → import summary.
- [ ] Create/edit/delete a personal category; confirm defaults are protected.
- [ ] Create budget; cross the warning threshold; cross 100%; see in-app notification.
- [ ] Create a recurring rule; process due occurrence; confirm no duplicates on a second run.
- [ ] Reports: every chart renders; custom date range; category/income-source filter; PDF + PNG download; email share (if SMTP).
- [ ] Saving tips: pin, dismiss, bookmark; dashboard shows top tips.
- [ ] Insights: generate, see flags, reload for history, delete one.
- [ ] Notes: create for transaction/tip/insight; edit; delete.
- [ ] Profile: update details; dark mode + font size persist after reload.
- [ ] Notifications: mark read, mark all read, delete, clear all.

### 4.2 Browser / E2E (admin)

- [ ] `/admin/login` with admin credentials; student credentials rejected.
- [ ] Dashboard/statistics show live counts.
- [ ] Users: disable → student login blocked → enable.
- [ ] Users: reset password → reset email received → new password works.
- [ ] Default categories: add, edit, delete, toggle.
- [ ] Templates: add, edit, delete, toggle; verify a template-based tip for a student.
- [ ] Announcements: create → student receives notification.
- [ ] Settings: add/edit/delete a key; admin dark mode toggle.

### 4.3 Email

- [ ] Password reset email (student) arrives; link opens hosted `/reset-password?token=…` (requires `FRONTEND_URL`).
- [ ] Admin “reset user password” email arrives.
- [ ] Report-share email arrives with the correct period/summary.
- [ ] Check spam folder; note SMTP deliverability from Vercel serverless (D2 in the gap analysis).

### 4.4 Responsive / cross-browser

- [ ] Desktop 1920×1080: Chrome + Edge (+ Firefox if available).
- [ ] Tablet ~768 px: sidebar collapses, tables scroll, charts resize.
- [ ] Mobile ~375 px: login/register usable, transaction modal usable, dashboard cards stack.
- [ ] No horizontal overflow on main pages.

### 4.5 Accessibility

- [ ] Keyboard-only: tab order logical on login, transaction modal, reports, admin tables.
- [ ] Visible focus outlines on buttons/links/inputs.
- [ ] `aria-label` present on icon-only buttons; images have `alt` text.
- [ ] Dark mode + large font size still readable (no invisible text/low contrast).
- [ ] Breadcrumbs accessible (`nav aria-label="Breadcrumb"`).

### 4.6 Security / data isolation

- [ ] Student 1 cannot see Student 2's transactions/categories/budgets/notes via UI or API ids.
- [ ] All protected endpoints return `401` without a token and `403` for the wrong role.
- [ ] Input validation rejects negative amounts, invalid ids and invalid dates.
- [ ] Forgot-password shows the same generic response for known/unknown emails.
- [ ] No secrets committed (`.env`, SMTP password, JWT secret) in either repo.

### 4.7 Deployment / submission

- [ ] Live frontend redeployed from the final commit; hard-refresh and re-test.
- [ ] Live backend `/health` returns 200/Connected.
- [x] Demo seed run against the configured Atlas database (3× idempotent); admin + student credentials verified live 2026-10-27 20:58 PKT (student2 not explicitly tested).
- [ ] Root `README.md`, `docs/` and the SRS PDF included in the zip.
- [ ] Demo video recorded (all SRS §1.6 features shown) and attached/submitted.
- [x] Temporary build/lint helper logs removed from the workspace; submission zip should contain only deliverables.
