# Campus Coin — Project Report Outline (Submission Scaffold)

> **Academic-integrity notice.** The SRS (page 10) explicitly forbids submitting fully AI-generated documentation and ready-made templates, and states that AI tools must be acknowledged and used only as aids. This file is therefore a **scaffold**, not the final report: it fixes the structure required by SRS §1.9, records the factual project data that is already verified in the repository, and marks every narrative/analysis section with **STUDENT TO WRITE**. You must write those sections in your own words, review every factual statement, and be able to explain all design decisions in a viva. Do not submit this outline as the report.

**How to use this outline**

1. Create `docs/PROJECT_REPORT.md` (or a Word/PDF document) using the section order below.
2. Replace every **STUDENT TO WRITE** block with your own prose.
3. Keep the factual tables (they are verified against the code) but re-check them after the final build.
4. Reference the companion documents for diagrams/data/setup — do not duplicate source code (the SRS forbids source code in the report).
5. Complete the AI-tools acknowledgement honestly and have every member review the submission.

---

## Suggested report structure (SRS §1.9)

| # | Section | Status | Source material |
|---|---|---|---|
| — | Cover page (title, theme, student names/IDs, course, date, institute) | **STUDENT TO WRITE** | — |
| — | Declaration & acknowledgement (incl. AI tools) | **STUDENT TO WRITE** | §11 below |
| — | Abstract (200–300 words) | **STUDENT TO WRITE** | §1–§2 facts |
| — | Table of contents, list of figures/tables | **STUDENT TO WRITE** | — |
| 1 | Problem Definition | **STUDENT TO WRITE** | facts in §1 |
| 2 | Proposed Solution & Scope | **STUDENT TO WRITE** | facts in §2 |
| 3 | Design Specifications (architecture, UI, stack) | mixed — facts provided, justification **STUDENT TO WRITE** | §3 + [ERD.md](ERD.md), [SITEMAP.md](SITEMAP.md) |
| 4 | Diagrams (flowcharts, DFDs, ERD, sitemap) | figures provided, explanation **STUDENT TO WRITE** | [DFD.md](DFD.md), [ERD.md](ERD.md), [SITEMAP.md](SITEMAP.md) |
| 5 | Database Design | facts provided, analysis **STUDENT TO WRITE** | §5 + [ERD.md](ERD.md) |
| 6 | Functional Requirements Implementation | facts provided, discussion **STUDENT TO WRITE** | §6 matrix |
| 7 | Non-Functional Requirements | implementation facts + **STUDENT TO WRITE** evaluation | §7 |
| 8 | Test Data & Test Results | data provided; results/analysis **STUDENT TO WRITE** | [TEST_DATA.md](TEST_DATA.md) |
| 9 | Installation Instructions | facts provided, walkthrough **STUDENT TO WRITE** | [README.md](../README.md), [DEPLOYMENT.md](DEPLOYMENT.md) |
| 10 | User Credentials (all user types) | provided — keep exactly as given | §10 |
| 11 | AI Tools Acknowledgement | template provided — **STUDENT TO COMPLETE** | §11 |
| 12 | Known Limitations & Future Work | facts provided, reflection **STUDENT TO WRITE** | §12 |
| 13 | Conclusion | **STUDENT TO WRITE** | — |
| — | References & Appendices (SRS, libraries, hosted URLs, video link) | mixed | §13 |

**Suggested overall length:** 30–40 pages excluding appendices, divided roughly as: problem/scope 15%, design 25%, database 15%, implementation 20%, testing 15%, conclusion/limitations 10%.

---

## 1. Problem Definition

**Factual background (verified from the SRS and code):**

- University students receive money from irregular sources (family allowance, part-time jobs, scholarships, gifts) and typically do not track spending; generic personal-finance apps target salaried adults, need bank integration and are often subscription-gated.
- There is a need for a lightweight, student-first web app for manual income/expense logging, category-wise spending visibility and plain-language savings guidance **without** bank-account linking or financial expertise.
- Campus Coin targets individual students, hostel communities and campus financial-literacy initiatives, with administrative oversight for categories, users and usage statistics.
- The system explicitly does **not** perform bank verification, payment processing or real monetary transactions (SRS §1.5).

**STUDENT TO WRITE (≈1–2 pages):** describe the motivation and target users in your own words; state the specific problem you set out to solve; list the pain points of existing apps; explain why this project is relevant to your campus context. Cite the SRS where appropriate.

---

## 2. Proposed Solution & Scope

**Factual solution summary (verified):**

- A responsive MERN web application: React 19 single-page app + Express 5 REST API + MongoDB Atlas.
- Students register/log in, log income and expenses with student-relevant categories, set monthly category budgets, view a dashboard (balance, top category, budget-vs-actual, spending chart, personalised tips), generate reports (category-wise, 6-month income-vs-expense, daily/weekly, filters, PDF/PNG export, email share), generate AI-style monthly insights, receive saving tips with pin/dismiss/bookmark, keep notes, and use CSV bulk import with AI-assisted review.
- Optional advanced features: recurring entries, soft-delete/restore for full transaction history, dark mode, font-size accessibility, in-app notifications, bookmarks.
- Administrators have a separate login and panel: manage default categories, tip templates, announcements, user accounts (view/disable/reset) and usage statistics.
- AI functionality is advisory: rule/feedback-based categorisation and rule-based monthly insights; results can be overridden (consistent with SRS §1.5).

**In scope:** everything above. **Out of scope (SRS §1.5):** real bank integration, bank-account verification, payment processing, actual money movement. Optional chat-bot is not implemented (placeholder only).

**STUDENT TO WRITE (≈1 page):** restate the scope in your own words; justify what you included/excluded; describe your target users and a short usage scenario (e.g. a first-time student logging a canteen purchase and setting a food budget).

---

## 3. Design Specifications

**Factual design (verified):**

- **Three-tier architecture:** Presentation layer (React SPA in `frontend/`), Application/API layer (Express controllers/services in `backend/`), Data layer (MongoDB Atlas via Mongoose).
- **Frontend structure:** `frontend/src/App.jsx` defines public, student-protected and admin-protected routes; `DashboardLayout` + `AdminLayout` provide navigation/breadcrumbs; pages under `frontend/src/pages/` (Home, Auth, student pages, admin pages); shared components (Navbar, Footer, Sidebar, Breadcrumbs, ProtectedRoute, Skeleton).
- **Backend structure:** `backend/api/index.js` mounts 17 route groups; controllers handle validation/business logic; services encapsulate AI suggestion/learning, insight generation, saving-tip generation, budget alerts and recurring materialisation; middleware handles JWT auth and centralised error mapping; 17 Mongoose models.
- **UI/UX:** responsive Bootstrap 5 layout, maroon/gold theme, dark mode, font-size accessibility, loading states/skeletons, toast notifications, breadcrumbs, home-page sitemap.
- **Security design:** bcrypt password hashing; stateless JWT (7-day default); role-based route guards; owner-scoped queries; input validation; generic password-recovery responses; helmet headers; CORS allow-list.
- **AI design:** no external AI service is required. A rule-based, offline categoriser learns from a student's own corrections/history (stored in `AIClassification`), and insight generation is deterministic rule-based analysis over the student's transactions (3-month baseline). Reports state clearly that these are advisory heuristics.
- **Data exchange:** JSON over HTTPS REST; the SPA attaches the JWT and calls the API base URL configured by `VITE_API_URL`.

**STUDENT TO WRITE (≈2 pages):** explain the architecture in your own words and why you chose it; describe the main user flows; describe your UI/UX decisions (themes, layout, accessibility); justify the AI approach (rule-based vs external API) and the security choices. Include screenshots of key screens. Do not paste source code.

---

## 4. Diagrams

**Factual figures are provided in the companion documents:**

- **ERD** (all 17 models, relationships, collection reference): [ERD.md](ERD.md)
- **Level-0 context diagram, Level-1 DFD, and flowcharts** (registration/login/reset, transaction lifecycle incl. soft delete/restore, budget alert, report generation): [DFD.md](DFD.md)
- **Sitemap** (public/student/admin routes, matching `App.jsx`): [SITEMAP.md](SITEMAP.md)

**STUDENT TO WRITE (≈1–2 pages):** insert the rendered diagrams (PNG/SVG or draw.io exports) with figure numbers/captions, and write a paragraph per diagram explaining the flow and decisions. Ensure every figure is referenced from the text.

---

## 5. Database Design

**Factual design (verified in `backend/models/`):**

- MongoDB Atlas is used (allowed by SRS §1.8; the SRS §1.2 “relational database” wording is superseded by the §1.8 database options).
- 17 collections: `users`, `categories`, `transactions`, `budgets`, `recurringtransactions`, `insights`, `savingtips`, `notifications`, `bookmarks`, `notes`, `aiclassifications`, `importbatches`, `activitylogs`, `announcements`, `tiptemplates`, `passwordresettokens`, `systemsettings`.
- Key relationships: a user owns transactions/categories (personal)/budgets/recurring/insights/tips/notifications/bookmarks/notes/activity; categories classify transactions, budgets, recurring rules and tip templates; recurring rules materialise transactions; import batches group CSV-created transactions; bookmarks/notes reference tips/insights/transactions polymorphically.
- Key constraints/indexes: `users.email` unique; `passwordresettokens.token` unique; `systemsettings.key` unique; transaction indexes on `{user,date}`, `{user,deletedAt,date}`, `{user,recurringTransaction,recurringOccurrence}`; soft delete via `transactions.deletedAt`.
- Bootstrap data: `seedCategories.js` inserts 5 income + 7 expense default categories; budgets have a configurable `alertPercentage` (default 80).

**STUDENT TO WRITE (≈2 pages):** describe the schema in your own words, explain the design decisions (document vs relational, embedded vs referenced data, soft delete, polymorphic references), include the ERD annotated with primary/foreign keys, and discuss any trade-offs. Complete the required “Database Design” deliverable with the collection reference table from [ERD.md](ERD.md).

---

## 6. Functional Requirements Implementation

**Factual implementation matrix (verified in the current tree):**

| SRS §1.6 requirement | Implementation |
|---|---|
| Student registration/login; separate admin login | `/register`, `/login`, `/admin/login`; JWT + role guards |
| Secure session management | JWT (7-day), protected routes, owner-scoped data |
| Password recovery via tokenised link | `/forgot-password` → 1-hour token → `/reset-password?token=…`; emails via Nodemailer |
| Editable profile (name, academic year, allowance, savings goal) | `/profile` + `PUT /api/users/profile` |
| Optional CSV bulk import | Transactions → Import CSV with preview/review; `/api/import/preview`, `/api/import/csv` |
| Personal income/expense categories | 12 seeded defaults + `/categories` CRUD; defaults protected |
| Dashboard (greeting, balance, quick-add, tips, top category, budget-vs-actual) | `/dashboard` + `GET /api/dashboard` |
| Income/expense logging with edit/delete/history | Transactions page; edit via `PUT`; soft delete + Deleted/Restore view |
| Recurring entries | Recurring panel + `/api/recurring` + materialisation service |
| AI category suggestion, override, learning, CSV batch suggestions | `/api/ai/categorize` + feedback; `/api/import/preview`; editable review |
| Monthly reports (category-wise, 6-month, daily/weekly, filters, PDF/image, share) | `/reports`; PDF/PNG client export; email share API |
| AI monthly insights (narrative, growth flags, advice, history) | `/insights` + `/api/insights/generate` (3-month baseline) |
| Saving tips (generated, ranked, pin/dismiss) | `/saving-tips`, dashboard top tips; templates supported |
| Budget goals + in-app alerts | `/budgets`, `GET /api/budgets/status`, `budgetAlert` notifications |
| Bookmarks (tips/insights), notes, sharing | `/saving-tips`, `/insights`, `/notes`, report email share |
| Admin panel (categories, templates, users, statistics) | `/admin/*` pages + admin API routes |
| Optional intelligence (recently viewed/edited, drafts, forecast) | Backend endpoints under `/api/activity` (no UI) |
| Accessibility (dark mode, font size, breadcrumbs, loading states) | Profile settings, breadcrumbs, skeletons/spinners, responsive CSS |

Full evidence per requirement (with file paths and status) is in [SRS_GAP_ANALYSIS.md](SRS_GAP_ANALYSIS.md).

**STUDENT TO WRITE (≈2 pages):** for each major feature, describe how it works from the user's perspective, include screenshots, and reflect on implementation challenges and how you solved them. Add the implementation matrix as a table (you may reuse the factual matrix, but explain it in your own words).

---

## 7. Non-Functional Requirements

**Factual implementation:**

- **Security:** bcrypt hashing, JWT authentication (production refuses to start without `JWT_SECRET`), role-based access, ownership checks, input validation, generic forgot-password response, per-instance rate limiting on auth routes, helmet, CORS allow-list, environment-based secrets. Remaining hardening (documented): move JWTs to httpOnly cookies, shared-store rate limiting for serverless.
- **Performance:** indexed Mongo queries; pagination option on transactions; no external AI calls (instant suggestions/insights); client-side report capture can be heavy on large reports.
- **Scalability:** stateless API on Vercel serverless; MongoDB Atlas; additive dashboard aggregation; recurring materialisation without a background scheduler (sweeps on relevant requests).
- **Availability:** hosted on Vercel + Atlas; `/health` reports DB connectivity; free-tier cold starts possible.
- **Compatibility:** Bootstrap 5 responsive layout, 32 media queries; manual cross-browser testing required.
- **Accessibility:** dark mode, font-size adjustment, breadcrumbs, aria labels, keyboard-operable controls, loading indicators.

**STUDENT TO WRITE (≈1–2 pages):** evaluate each NFR honestly (what is strong, what is limited), describe how you tested/observed it, and discuss trade-offs (e.g. serverless cold starts, free-tier Atlas limits, per-instance rate limiting, JWT storage in localStorage).

---

## 8. Test Data & Test Results

**Factual data:**

- Demo credentials: administrator `admin@campuscoin.test / Admin@12345`; students `student@campuscoin.test / Student@12345` and `student2@campuscoin.test / Student@12345`.
- Seed script executed: `backend/seedDemo.js` via `npm run seed` was run three times (idempotent) against the configured Atlas database. Actual counts: **users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, savingTips=7**, data spanning **2026-05 → 2026-10**; the three demo credentials were verified live against the hosted API at 2026-10-27 20:58 PKT (production guard: `NODE_ENV=production` requires `ALLOW_DEMO_SEED=true`).
- Full test-case catalogue (auth, validation, ownership/security, categories, transactions incl. soft delete/restore, recurring, CSV/AI, budgets/alerts, reports/export, insights, tips, bookmarks/notes, admin) and a manual QA checklist: [TEST_DATA.md](TEST_DATA.md).

**STUDENT TO WRITE (≈2 pages):** record your own test execution results with a results table (Test ID, expected, actual, pass/fail, evidence screenshot), report defects found and fixes, and summarise coverage against the SRS requirements. Do not fabricate results — run the tests.

---

## 9. Installation Instructions

**Factual setup (complete guide in [README.md](../README.md); deployment in [DEPLOYMENT.md](DEPLOYMENT.md)):**

1. Prerequisites: Node.js 20.19+/22.12+, npm, MongoDB Atlas cluster/URI, optional SMTP account.
2. Backend: install dependencies, copy `.env.example` → `.env`, set `DBURI`, `JWT_SECRET`, `FRONTEND_URL`, SMTP values; run `npm run seed`; start `npm run dev` (default port 5000); health at `/health`.
3. Frontend: install dependencies, set `VITE_API_URL=http://localhost:5000/api`, start `npm run dev` (default port 5173).
4. Hosted deployment: Vercel projects for frontend and backend + env vars + seed the production database (details in [DEPLOYMENT.md](DEPLOYMENT.md)).
5. Hosted URL: https://sfc-mindforge-frontend.vercel.app (API: https://sfc-mindforge-backend.vercel.app).

**STUDENT TO WRITE (≈1 page):** walk through the installation on your machine in your own words (include screenshots of a successful backend health check and the running frontend). Note the exact commands you used and any issues you hit.

---

## 10. User Credentials (all user types — mandatory)

**Keep these values exactly as agreed:**

| User type | Email | Password | Notes |
|---|---|---|---|
| Administrator | `admin@campuscoin.test` | `Admin@12345` | Separate admin login `/admin/login` |
| Student | `student@campuscoin.test` | `Student@12345` | Primary demo account with seeded data |
| Student | `student2@campuscoin.test` | `Student@12345` | Used to demonstrate data isolation |

These accounts were created by the seed script in the database used by the hosted deployment and were verified live on 2026-10-27 20:58 PKT. Record any re-seeding in the report.

> **STUDENT TO WRITE:** confirm the credentials in the report, and state clearly that they are demo accounts created for evaluation only.

---

## 11. AI Tools Acknowledgement (mandatory per SRS page 10)

**Template — STUDENT TO COMPLETE HONESTLY.** List every AI tool actually used and what it was used for. Example table:

| Tool | Version/model (if known) | What it was used for | How the team validated the output |
|---|---|---|---|
| *(e.g. AI coding assistant used in the dev environment — DeepSeek Harness)* | *(e.g. DeepSeek)* | Code review, SRS compliance analysis, documentation scaffolding (README/ERD/DFD/test-data drafts) | Team reviewed all suggestions, ran the code, rewrote documentation in own words |
| *(add any others: ChatGPT / Copilot / Gemini / Figma AI / Canva AI …)* | | | |

**Statement to adapt:** “AI tools were used as supporting aids. All AI-generated suggestions were reviewed, validated and integrated by the team. No ready-made website template was used. The narrative and analysis in this report were written by the team; AI assisted with drafting structure and checking the SRS mapping only.”

> **STUDENT TO WRITE/CONFIRM:** finalise the tool list and the statement; ensure every AI tool used is included. Do not claim AI was not used if it was.

---

## 12. Known Limitations & Future Work

**Factual limitations (from the implementation and gap analysis):**

- Optional system-intelligence features (recently viewed/edited, duplicate/unusual flags, next-month forecast) exist as backend endpoints but have no student UI.
- The AI category assistant and monthly insights are rule-based heuristics (no external ML/LLM); they are advisory and overridable.
- The AI chatbot endpoint is a placeholder (optional in SRS §1.8).
- Report PDF/image export runs in the browser; server-side export routes intentionally return `501`.
- Email features require valid SMTP configuration and `FRONTEND_URL`; deliverability from serverless hosting is not guaranteed.
- Security notes: auth endpoints are rate-limited and `JWT_SECRET` is enforced in production; JWTs are stored in `localStorage` (httpOnly cookies recommended for a future iteration), and the rate limiter is per-instance because the API runs on serverless functions.
- No automated test suite; testing is manual (see [TEST_DATA.md](TEST_DATA.md)).
- Recurring occurrences are materialised on request (dashboard/recurring page) rather than by a background scheduler.
- Live deployment must be redeployed to pick up the latest build.

**STUDENT TO WRITE (≈1 page):** reflect on what you would improve next (e.g. background recurring scheduler, notification preferences, chart export server-side, rate limiting, real AI/LLM integration, mobile PWA, automated tests), and prioritise future work.

---

## 13. Conclusion & References

- **STUDENT TO WRITE (≈0.5–1 page):** summarise what was built, how it meets the SRS, what you learned, and the project's limitations; close with future direction.

**References (suggested):**

- Aptech *CampusCoin End-to-End Web Solutions* SRS (provided PDF) — cite sections §1.1–§1.9.
- React, Vite, Express, Mongoose, MongoDB Atlas, Bootstrap, Recharts, React Router, jsonwebtoken, bcrypt, Nodemailer, html2canvas, jsPDF — official documentation.
- Repository documents: [SRS_GAP_ANALYSIS.md](SRS_GAP_ANALYSIS.md), [ERD.md](ERD.md), [DFD.md](DFD.md), [TEST_DATA.md](TEST_DATA.md), [DEPLOYMENT.md](DEPLOYMENT.md), [SITEMAP.md](SITEMAP.md), [README.md](../README.md).

---

## 14. Submission checklist (SRS §1.9)

- [ ] Report covers: problem definition, design specifications, diagrams, database design, test data, installation instructions, user credentials, AI acknowledgement.
- [ ] Report contains **no source code** (SRS requirement).
- [ ] Diagrams included as figures (DFD, ERD, flowcharts, sitemap) with captions and references.
- [ ] Installation instructions and credentials section present and correct.
- [ ] Hosted URL included and working (redeploy first): https://sfc-mindforge-frontend.vercel.app.
- [ ] Demo video (`.mp4`) recorded showing all SRS §1.6 features and submitted (mandatory).
- [ ] Consolidated zip: report (PDF/Word), `README.md`, database schema files/ERD, test data + credentials, SRS PDF, video link/file. **Nothing from `.env`/secrets.**
- [ ] AI tools acknowledged; narrative sections written by the team (not fully AI-generated).
- [ ] All team members can explain the design, implementation and code in a viva.
