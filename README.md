# Campus Coin — Smart Spending, Student Style

**Campus Coin** is a full-stack, student-first budgeting web application built for the *NextGen BudgetBee* / *End-to-End Web Solutions* brief. Students log income and expenses, manage personal categories, set monthly category budgets, review reports and insights, and receive personalised saving tips. Administrators manage default categories, tip templates, announcements, users and usage statistics.

| | |
|---|---|
| **SRS** | [`CampusCoin End-to-End Web Solutions_SRS.pdf`](<CampusCoin End-to-End Web Solutions_SRS.pdf>) |
| **Theme / category** | NextGen BudgetBee — End-to-End Web Solutions |
| **Stack** | MongoDB Atlas + Express 5 + React 19 + Node.js (MERN), Vite 8, Bootstrap 5 |
| **Hosted frontend** | https://sfc-mindforge-frontend.vercel.app |
| **Hosted API** | https://sfc-mindforge-backend.vercel.app &nbsp;·&nbsp; health: https://sfc-mindforge-backend.vercel.app/health |

> **Deployment note:** the live frontend build may lag the current repository until it is redeployed (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). Verify the hosted URLs after any redeploy.

---

## Demo credentials

Seeded by the backend seed script (see [Seeding test data](#seeding-test-data) and [docs/TEST_DATA.md](docs/TEST_DATA.md)). **Never use these accounts for real data.**

| Role | Email | Password | Purpose |
|---|---|---|---|
| Administrator | `admin@campuscoin.test` | `Admin@12345` | Admin panel (`/admin/login`) |
| Student (primary demo) | `student@campuscoin.test` | `Student@12345` | Student portal (`/login`) |
| Student (secondary) | `student2@campuscoin.test` | `Student@12345` | Ownership/security checks (two-student isolation) |

> **Seed status — EXECUTED & VERIFIED (2026-10-27 20:58 PKT):** the backend engineer ran `npm run seed` three times (idempotent) against the configured Atlas database, and the Lead independently verified the logins against the hosted API: `admin@campuscoin.test` → 200 with `role=admin`, `student@campuscoin.test` → 200 (`name = Ayesha Khan`). Actual seeded counts: **users=3, categories=13, demo transactions=131, budgets=3, recurring=1, insights=2, savingTips=7**, data spanning **2026-05 → 2026-10**. The three credentials above are live. Safety guard: when `NODE_ENV=production`, the script refuses to run unless `ALLOW_DEMO_SEED=true` is set. Details and the verified hosted evidence are in [docs/TEST_DATA.md](docs/TEST_DATA.md).

---

## Features (mapped to SRS §1.6)

### Student portal

| SRS area | What is implemented |
|---|---|
| Authentication & profile (§1.6) | Register, login, JWT sessions, tokenised password reset (email link), editable profile (name, academic year, monthly allowance, savings goal), optional CSV bulk import. |
| Category management (§1.6) | 5 default income + 7 default expense categories seeded; students add/edit/delete their own categories; defaults are protected. |
| Personalised dashboard (§1.6) | Greeting, current-month income/expense/balance, quick-add buttons, top category, budget-vs-actual progress bars, spending breakdown chart, generated saving tips with dismiss. |
| Income & expense logging (§1.6) | Quick-add modal with student categories, edit, soft delete + **Deleted/Restore** view (full history retained), recurring entries (weekly/monthly/yearly, materialised automatically), CSV import with AI-assisted review. |
| AI categorisation assistant (§1.6) | Live category suggestion while typing, manual override, correction feedback that biases later suggestions, batch suggestions for CSV import. |
| Monthly reports (§1.6) | Category-wise spending, 6-month income-vs-expense, daily and weekly summaries, custom From/To + category/income-source/type filters, browser PDF/PNG export, email share. |
| AI-style monthly insights (§1.6) | Plain-language monthly narrative, categories flagged against a 3-month baseline, actionable advice, stored insight history. |
| Saving tips (§1.6) | Generated from the student's transactions/budgets + admin templates, ranked by impact, pin/dismiss, bookmarks, top tips on dashboard. |
| Budget goals & alerts (§1.6) | Monthly budget per category with configurable alert percentage, live progress bars, in-app notification when nearing/exceeding a budget. |
| Bookmarking, notes, sharing (§1.6) | Bookmark tips and insights; notes attached to transactions/tips/insights; report PDF/PNG export and email share. |
| Accessibility & UX (§1.6) | Dark mode + 3-step font size (persisted per account and restored on reload), breadcrumbs, loading states/skeletons, responsive layout, home-page sitemap. |
| Optional intelligence (§1.6, optional) | Backend endpoints for recently viewed/edited, duplicate/unusual detection and next-month forecast (API only; no student UI yet — see known limitations). |

### Admin panel

| SRS area | What is implemented |
|---|---|
| Admin control panel (§1.6) | Direct admin login page (`/admin/login`), add/edit/remove system default categories, add/edit/remove announcement & tip templates, view/disable/enable/reset users, usage statistics (active users, total users/transactions/categories, most-used categories, monthly usage chart), admin dark mode. |
| Announcements | Creating an announcement also creates an in-app notification for every active student. |

### Non-functional (§1.7)

- **Security:** bcrypt password hashing, JWT-protected routes, owner-scoped queries, ownership checks on categories/budgets/transactions/notes/bookmarks, generic password-recovery response (no user enumeration), dependency-free rate limiting on auth endpoints, startup refusal if `JWT_SECRET` is missing in production, helmet, strict CORS allow-list.
- **Performance:** indexed MongoDB queries (`{user,date}`, recurring lookups), paginated transaction endpoint (optional `page`/`limit`), local (no external API) AI-style rules so insights load instantly.
- **Compatibility:** responsive Bootstrap 5 layout with 32 media queries across the UI; tested layout targets desktop, tablet and mobile (manual QA checklist in [docs/TEST_DATA.md](docs/TEST_DATA.md)).
- **Availability:** stateless Express API on Vercel serverless + MongoDB Atlas; `GET /health` reports server and database status.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Bootstrap 5, Recharts, Lucide icons, react-hot-toast, Axios |
| Export | html2canvas + jsPDF (client-side PDF/PNG report export) |
| Backend | Node.js, Express 5, Mongoose 9, JWT (jsonwebtoken), bcrypt/bcryptjs, helmet, CORS, morgan, cookie-parser, express-validator |
| Email | Nodemailer (SMTP; used for password reset and report sharing) |
| Database | MongoDB Atlas (MongoDB chosen as allowed by SRS §1.8) |
| Hosting | Vercel (frontend static + backend serverless functions) |

---

## Repository layout

```
SFC-Mindforge/
├── README.md                     # this file
├── CampusCoin End-to-End Web Solutions_SRS.pdf
├── backend/                      # Express REST API (Node.js)
│   ├── api/index.js              # app entry + middleware + all /api route mounting
│   ├── config/db.js              # MongoDB connection helper
│   ├── controllers/              # 23 controllers (auth, transactions, reports, admin, …)
│   ├── middleware/               # auth (JWT) + centralised error handler
│   ├── models/                   # 17 Mongoose models (see docs/ERD.md)
│   ├── routes/                   # 17 route modules mounted under /api/*
│   ├── services/                 # ai, insight, tip, budget-alert, recurring engines
│   ├── utils/                    # email, category access, validation helpers
│   ├── seedCategories.js         # seeds the 12 default categories
│   ├── .env.example              # backend environment template
│   └── vercel.json               # serverless routing
├── frontend/                     # React SPA (Vite)
│   ├── src/App.jsx               # all routes (public / student / admin)
│   ├── src/api/axios.js          # API client (VITE_API_URL + JWT header)
│   ├── src/components/           # Navbar, Footer, Sidebar, Breadcrumbs, ProtectedRoute, Skeleton
│   ├── src/layouts/              # DashboardLayout
│   └── src/pages/                # Home, Auth, student pages, admin pages
└── docs/
    ├── SRS_GAP_ANALYSIS.md       # requirement-by-requirement audit
    ├── ERD.md                    # database design (Mermaid ERD + collection reference)
    ├── DFD.md                    # data-flow diagrams + flowcharts
    ├── TEST_DATA.md              # demo credentials, seed data, test cases, QA checklist
    ├── DEPLOYMENT.md             # Vercel/Atlas deployment guide
    ├── SITEMAP.md                # page sitemap
    ├── PROJECT_REPORT_OUTLINE.md # academic report scaffold ("STUDENT TO WRITE" markers)
    └── srs_extracted_text.txt    # searchable text of the SRS (reference only)
```

---

## Prerequisites

- **Node.js 20.19+ or 22.12+** (Vite 8 requirement) and npm.
- **MongoDB** — a MongoDB Atlas cluster URI (or local `mongod`). Atlas network access must allow your IP / `0.0.0.0/0` for hosted deployments.
- **SMTP account** (optional but needed for password-reset and report emails; any SMTP provider works — the template uses Gmail).
- **Git** and two GitHub repositories (frontend/backend are separate repos with `origin` remotes configured).

---

## Local setup

### 1. Backend API (`backend/`)

```powershell
cd backend
npm install
Copy-Item .env.example .env    # then edit .env with your values
npm run seed                   # seeds default categories + demo users/data (see note below)
npm run dev                    # http://localhost:5000  (nodemon)
```

`npm run seed` runs `backend/seedDemo.js`, which seeds default categories, the demo admin/student accounts, 6 months of transactions, budgets, a recurring allowance and sample insights. When `NODE_ENV=production` the script requires `ALLOW_DEMO_SEED=true` (safety guard) — normally you seed from a local shell with the production `DBURI` and `NODE_ENV` unset. Verify `/health` returns `200` and `"database": {"status": "Connected"}`.

Backend environment variables (template: `backend/.env.example`):

| Variable | Required | Example / notes |
|---|---|---|
| `PORT` | local only | `5000` (Vercel ignores this; serverless handles routing) |
| `DBURI` | ✅ | `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority` |
| `JWT_SECRET` | ✅ | long random string — generate with `openssl rand -hex 32` |
| `JWT_EXPIRE` | optional | `7d` (default) |
| `FRONTEND_URL` | ✅ for emails | `http://localhost:5173` locally; hosted frontend URL in production |
| `EMAIL_HOST` | for emails | `smtp.gmail.com` |
| `EMAIL_PORT` | for emails | `587` |
| `EMAIL_USER` | for emails | SMTP username / sender address |
| `EMAIL_PASS` | for emails | SMTP app password (never commit) |
| `NODE_ENV` | optional | `production` disables the dev password-reset token fallback |

> Never commit `.env` — only `.env.example` belongs in git. Frontend `.env` is tracked for local defaults; do not put secrets in it.

### 2. Frontend SPA (`frontend/`)

```powershell
cd frontend
npm install
# frontend/.env should contain the API base URL:
# VITE_API_URL=http://localhost:5000/api
npm run dev                    # Vite dev server, http://localhost:5173
```

Production build:

```powershell
npm run build                  # outputs frontend/dist/
npm run preview                # optional local preview of the build
```

Frontend environment variables:

| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | ✅ | local: `http://localhost:5000/api`; hosted: `https://sfc-mindforge-backend.vercel.app/api` |

API calls attach `Authorization: Bearer <JWT>` from `localStorage` and clear the session on a `401` response (`frontend/src/api/axios.js`).

---

## Seeding test data

The seed script (`npm run seed` → `backend/seedDemo.js`) creates:

- 1 administrator and 2 students (credentials in the table above; `student2` is login-only for isolation checks),
- 12 system default categories (5 income, 7 expense; the configured DB reports 13 categories),
- 131 demo transactions across 6 months (2026-05 → 2026-10) for `student@campuscoin.test`,
- 3 current-month category budgets — Food 4,000 / Transport 1,500 / Subscriptions 1,200 (one tuned to cross its alert threshold),
- 1 recurring monthly allowance (15,000, income) and 2 sample monthly insights,
- 7 pre-generated saving tips so the dashboard is useful immediately.

The script is idempotent: it deletes/recreates only data owned by the three demo accounts, so it is safe to re-run (it was run three times during setup). It also refuses to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is set.

> **Execution status — DONE:** seeded against the configured Atlas database and verified via the hosted API on 2026-10-27 20:58 PKT (admin and student logins returned 200). The hosted *deployment* is still stale: it returns the old dashboard payload shape (`budgets`/`spendingBreakdown` are `null`) until Vercel is redeployed. Email delivery, browser E2E and responsive/accessibility checks remain **NOT RUN** — see [docs/TEST_DATA.md](docs/TEST_DATA.md).

---

## API overview

All endpoints are mounted under `/api` in `backend/api/index.js`. Except for `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token` and the two health routes, every endpoint requires a JWT.

| Group | Base path | Representative endpoints |
|---|---|---|
| Health / root | `/` `/health` | `GET /` (API + DB status), `GET /health` |
| Auth | `/api/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /me`, `POST /forgot-password`, `POST /reset-password/:token`, `PUT /change-password` |
| Users | `/api/users` | `GET/PUT /profile`, `PUT /preferences`, `PUT /profile-image`, `DELETE /account` |
| Categories | `/api/categories` | `GET /`, `GET /type/:type`, `GET/POST/PUT/DELETE /:id` |
| Transactions | `/api/transactions` | `GET /` (optional `page`/`limit`), `GET /recent`, `GET /summary/monthly`, `GET /deleted`, `POST /:id/restore`, `POST /`, `PUT /:id`, `DELETE /:id` (soft delete), `POST /bulk-delete` |
| Budgets | `/api/budgets` | `GET /`, `GET /status`, `GET /month/:month`, `POST /`, `PUT /:id`, `DELETE /:id` |
| Recurring | `/api/recurring` | `GET /`, `POST /`, `POST /process`, `PUT /:id`, `PUT /:id/toggle`, `DELETE /:id` |
| Saving tips | `/api/saving-tips` | `GET /`, `GET /top`, `POST /generate`, `PUT /:id/pin`, `PUT /:id/dismiss` |
| Insights | `/api/insights` | `GET /`, `GET /current`, `GET /:month`, `POST /generate`, `DELETE /:id` |
| Notifications | `/api/notifications` | `GET /`, `GET /unread-count`, `POST /refresh-budget-alerts`, `PUT /read-all`, `PUT /:id/read`, `DELETE /:id` |
| Bookmarks | `/api/bookmarks` | `GET /`, `POST /`, `DELETE /:id` |
| Notes | `/api/notes` | `GET /`, `GET /ref/:type/:id`, `POST /`, `PUT /:id`, `DELETE /:id` |
| Reports | `/api/reports` | `GET /category-wise`, `/income-expense`, `/daily`, `/weekly`, `/filter`, `/export/pdf` (501 by design), `/export/image` (501), `POST /share/email` |
| Dashboard | `/api/dashboard` | `GET /` (balance + budgets + spending breakdown + tips + insight), `GET /greeting`, `/top-category`, `/budget-vs-actual`, `/balance` |
| Import | `/api/import` | `POST /preview` (AI suggestions), `POST /csv`, `GET /batches`, `GET /batches/:id`, `POST /batches/:id/apply-ai` |
| AI | `/api/ai` | `POST /categorize`, `POST /categorize/feedback`, `GET /classification-history`, `POST /chatbot` (placeholder) |
| Activity | `/api/activity` | `GET /recent-views`, `/recent-edits`, `/duplicates`, `/unusual`, `/forecast` |
| Admin | `/api/admin` | `GET/PUT /users…`, `GET /stats/overview|usage`, `GET/POST/PUT/DELETE /categories…`, `/tip-templates…`, `/announcements…`, `/settings…` (admin JWT required) |

PDF/image report export is implemented **in the browser** (html2canvas + jsPDF); the backend export routes intentionally return `501 Not Implemented` with a pointer to the UI export.

---

## Deployment (summary)

Full step-by-step instructions, env-var tables and troubleshooting: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

1. **Backend (Vercel):** new project from the backend repo → Node serverless (uses `vercel.json`) → set env vars (`DBURI`, `JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL`, `EMAIL_*`, `NODE_ENV=production`) → deploy. Confirm `https://<backend>/health` returns 200/Connected.
2. **Frontend (Vercel):** new project from the frontend repo → framework Vite, build `npm run build`, output `dist` → set `VITE_API_URL=https://<backend-domain>/api` → deploy. SPA deep links work via `vercel.json` rewrites.
3. **Seed the production database** once (run the seed script with the production `DBURI`).
4. Redeploy both projects after any code change (`git push` on the connected branch, or Vercel → **Redeploy**).

**CORS:** the API allow-list is hard-coded in `backend/api/index.js` to localhost ports and the two Vercel domains. A new/custom domain requires adding it there.

---

## Accessibility & UX

- **Dark mode** and **font size** (small / normal / large) on the Profile page; saved to the user record (`preferences`) and restored on reload for the student panel; separate admin dark-mode toggle.
- **Breadcrumbs** on every student/admin page; labelled navigation and icon buttons (`aria-label`), keyboard-operable controls.
- **Loading states and skeletons** while data/charts load; toast feedback for async actions.
- **Sitemap** section on the home page (`/#sitemap`) plus navbar/footer links; see [docs/SITEMAP.md](docs/SITEMAP.md).

---

## AI tools used & acknowledgement

> **STUDENT TO CONFIRM / COMPLETE** — the SRS (page 10) requires every AI tool used to be acknowledged. List each tool below before submission, and confirm that the final report was written by the team (SRS forbids fully AI-generated documentation).

Known from the development environment: an **AI coding/review assistant (DeepSeek model, via DeepSeek Harness)** was used by the team for code review, SRS compliance analysis, debugging suggestions and **documentation scaffolding** (this README plus the drafts in `docs/`). The team must review, verify and rewrite these documents in their own words for submission.

| Tool | What it was used for | STUDENT TO CONFIRM |
|---|---|---|
| AI coding/review assistant (DeepSeek Harness) | SRS gap analysis, code review, documentation scaffolding | ☐ |
| *(add any other tools used, e.g. ChatGPT / Copilot / Gemini / Canva / Figma AI)* | *(purpose)* | ☐ |

No ready-made website template was used; the application design, structure and implementation were reviewed and validated by the team.

---

## Known limitations

- **Optional system-intelligence UI** (recently viewed/edited, duplicate/unusual flags, forecast) is backend-only — endpoints exist under `/api/activity`, no dashboard widget yet.
- **AI chatbot** is a placeholder endpoint (optional in SRS §1.8).
- The hosted **frontend build may be stale** until redeployed — always verify the hosted URLs after deployment.
- **Email features** (reset link, report share) require valid SMTP credentials and `FRONTEND_URL`; deliverability from serverless hosting may be rate-limited.
- Security notes: auth endpoints are rate-limited (in-memory, per serverless instance) and `JWT_SECRET` is required in production (the server refuses to start without it); JWTs are still stored in `localStorage` — a future iteration should move to httpOnly cookies.
- `npm run lint` reports pre-existing style issues in untouched files (non-blocking); there is no automated test suite yet.
- MongoDB is used instead of a relational database — explicitly allowed by SRS §1.8.
- The “full history” requirement is implemented via **soft delete + restore** for transactions (deleted rows are excluded from reports/budgets/insights but retained and restorable from the Transactions → Deleted view).

---

## Documentation index

| Document | Contents |
|---|---|
| [docs/SRS_GAP_ANALYSIS.md](docs/SRS_GAP_ANALYSIS.md) | Requirement-by-requirement compliance audit with evidence |
| [docs/ERD.md](docs/ERD.md) | Mermaid ERD + collection/field reference |
| [docs/DFD.md](docs/DFD.md) | Level-0/1 DFDs and flowcharts |
| [docs/TEST_DATA.md](docs/TEST_DATA.md) | Demo credentials, seed data, test cases, QA checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel/Atlas setup, env vars, redeploy, seeding production |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Page sitemap and route table |
| [docs/PROJECT_REPORT_OUTLINE.md](docs/PROJECT_REPORT_OUTLINE.md) | Academic report scaffold (student to write narrative) |
| [docs/srs_extracted_text.txt](docs/srs_extracted_text.txt) | Plain-text extraction of the SRS (reference) |

---

## License & credits

- Academic coursework project submitted against the Aptech *CampusCoin End-to-End Web Solutions* SRS; no open-source licence is declared (backend `package.json` declares `ISC`).
- Built with React, Vite, Bootstrap, React Router, Recharts, Lucide, react-hot-toast, Axios, html2canvas, jsPDF, Express, Mongoose, MongoDB Atlas, JWT, Nodemailer and bcrypt.
- Icons and illustrations from the respective open-source packages/assets in `frontend/src/assets`.
