# Campus Coin — Deployment Guide

**Target architecture:** GitHub → Vercel (frontend static build + backend serverless functions) → MongoDB Atlas database; SMTP provider for password-reset/report emails.

| Component | Hosted URL | Repository |
|---|---|---|
| Frontend (Vite/React SPA) | https://sfc-mindforge-frontend.vercel.app | `github.com/zeeshankhalidch/sfc-mindforge-frontend` |
| Backend (Express API, Vercel serverless) | https://sfc-mindforge-backend.vercel.app | `github.com/zeeshankhalidch/sfc-mindforge-backend` |
| Health check | https://sfc-mindforge-backend.vercel.app/health | — |
| Database | MongoDB Atlas cluster (`test` database) | — |

**Current status (2026-10-27 21:00 PKT):** backend `/health` returns HTTP 200 with `database.status = "Connected"`; frontend `/` returns HTTP 200. The demo seed has been **executed** (3 idempotent runs) against the configured Atlas DB and the three credentials were **verified live** against the hosted API at 20:58 PKT (admin `200 role=admin`; student `200 name=Ayesha Khan`). The live frontend bundle (`/assets/index-DqOCvIVx.js`) is still **older than the latest local build** (`/assets/index-CKElQQtZ.js`, from the Lead's final build), and the stale hosted backend returns the old dashboard shape (`budgets=null`/`spendingBreakdown=null`), so **both Vercel projects must be redeployed and their env vars checked** before submission (§5, §7).

---

## 1. Prerequisites

- Vercel account (free tier is fine) with the two GitHub repositories connected.
- MongoDB Atlas account + cluster, database user, and network access configured (§4).
- SMTP credentials for outbound email (Gmail app password or another provider).
- Node.js 20.19+ / 22.12+ and npm locally (for seeding and local verification).
- Git remotes already configured in both repos (`origin`).

---

## 2. Backend deployment (Vercel)

1. **Vercel → Add New → Project → Import** the backend repository.
2. **Configure:**
   - **Root Directory:** repository root (this repo *is* the backend; `backend/vercel.json` defines the build).
   - **Framework Preset:** Other.
   - **Build Command:** leave empty / default (Vercel uses `vercel.json` → `@vercel/node` on `api/index.js`).
   - **Install Command:** `npm install`.
   - **Output Directory:** leave empty.
3. **Environment Variables** (Project → Settings → Environment Variables → Production **and** Preview):

| Variable | Value for hosted backend | Required |
|---|---|---|
| `DBURI` | MongoDB Atlas connection string (SRV, with database name) | ✅ |
| `JWT_SECRET` | long random secret (e.g. `openssl rand -hex 32` or a 64-char random string) | ✅ |
| `JWT_EXPIRE` | `7d` (optional; default is 7d) | optional |
| `FRONTEND_URL` | `https://sfc-mindforge-frontend.vercel.app` | ✅ (password-reset & report-share links) |
| `EMAIL_HOST` | `smtp.gmail.com` (or your SMTP host) | for email |
| `EMAIL_PORT` | `587` | for email |
| `EMAIL_USER` | SMTP username / sender address | for email |
| `EMAIL_PASS` | SMTP app password | for email |
| `NODE_ENV` | `production` (disables the dev password-reset token fallback) | ✅ recommended |
| `PORT` | **not needed on Vercel** (serverless routing); local default is `5000` | — |

4. **Deploy.** Vercel builds `api/index.js` as a serverless function. Every `/api/*` request is routed to it by `backend/vercel.json`; non-API paths are also routed to the app (which only serves JSON routes + health).
5. **Verify:** open `https://sfc-mindforge-backend.vercel.app/health` → expect HTTP `200` and `"database": { "status": "Connected" }`. If it returns `503`, check `DBURI` and Atlas network access (§4).

> **Do not set secrets in `frontend/` or commit `.env`.** Only `.env.example` is committed; real values live in Vercel env settings (and local `.env`, which is git-ignored).

---

## 3. Frontend deployment (Vercel)

1. **Vercel → Add New → Project → Import** the frontend repository.
2. **Configure:**
   - **Root Directory:** repository root (this repo is the frontend).
   - **Framework Preset:** Vite.
   - **Build Command:** `npm run build`.
   - **Output Directory:** `dist`.
   - **Install Command:** `npm install`.
3. **Environment Variable** (Production and Preview):

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://sfc-mindforge-backend.vercel.app/api` |

4. **Deploy.** `frontend/vercel.json` rewrites all paths to `/index.html`, so React Router deep links (`/dashboard`, `/admin/users`, …) work on refresh.
5. **Verify:** open the hosted frontend → home page loads → login works against the hosted API (browser devtools → Network shows requests to `/api/...` on the backend domain, not localhost).

> **Stale-build warning:** Vercel serves the last successful deployment. If a code change is not visible, check the deployment list, trigger **Redeploy**, then hard-refresh (`Ctrl+Shift+R`). The live bundle filename should change (currently `index-DqOCvIVx.js`; the latest local build is `index-CKElQQtZ.js`, from the Lead's final build).

---

## 4. MongoDB Atlas setup

1. Create a free M0 cluster (AWS/GCP/Azure as preferred) and a database (e.g. `test` or `campuscoin`).
2. **Database Access:** create a user with read/write access to the app database. Store the password securely.
3. **Network Access:** add an IP allow-list entry. Vercel serverless functions have no static egress IPs, so for a coursework demo allow `0.0.0.0/0` (and note this in the report as a demo compromise); for stricter setups use a NAT gateway/static IP plan.
4. Copy the **connection string** (Drivers → Node.js): `mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority` → set as `DBURI` in the backend environment.
5. **SRV/DNS note:** if `mongodb+srv` resolution fails with `querySrv ECONNREFUSED` on a local network (an issue observed in the development environment), try a different DNS/network (e.g. set DNS to 8.8.8.8) or use a non-SRV connection string; the same URI works from Vercel. The hosted `/health` endpoint proves the Atlas link when configured correctly.
6. Optionally enable Atlas backups / alerts for availability (SRS NFR).

---

## 5. Redeploy workflow

**Option A — Git push (recommended, if GitHub integration is connected):**

```powershell
# backend
cd backend
git add -A
git commit -m "Describe change"
git push origin main          # or your connected branch

# frontend
cd ../frontend
git add -A
git commit -m "Describe change"
git push origin main
```

Vercel auto-builds on push. Confirm both deployments finish successfully in the Vercel dashboard.

**Option B — Vercel dashboard:** Project → **Deployments** → latest → **Redeploy** (use the same environment variables).

After redeploying:

1. `GET https://sfc-mindforge-backend.vercel.app/health` → 200 / Connected.
2. Hard-refresh the frontend; open login; confirm API calls target the hosted backend.
3. Re-run the manual checklist in [TEST_DATA.md](TEST_DATA.md).

---

## 6. Seeding the hosted database

The demo credentials (`admin@campuscoin.test / Admin@12345`, `student@campuscoin.test / Student@12345`, `student2@campuscoin.test / Student@12345`) must exist in the Atlas database the deployed backend uses.

1. The seed script is present in the repo: `backend/seedDemo.js` with npm script `seed` → `node seedDemo.js`.
2. From your machine, create `backend/.env` with the **production** `DBURI` (plus a local `JWT_SECRET`; no server is started by the seed) and leave `NODE_ENV` unset/`development`.
3. Run:

```powershell
cd backend
npm run seed
```

   **Production guard:** if `NODE_ENV=production`, the script refuses to run unless `ALLOW_DEMO_SEED=true` is set — this protects a real production database from being overwritten with demo data. The script is idempotent and only replaces data owned by the three demo accounts; it prints a summary (users, categories, transaction/budget/recurring/insight/tip counts, covered months).
4. Verify on the hosted site: log in as admin and both students; confirm demo transactions/budgets/insights exist. Then remove the production `DBURI` from any local notes.

> **Execution status — DONE (2026-10-27):** the seed was run three times (idempotent) against the configured Atlas database. Resulting counts: **users=3, categories=13, transactions=131, budgets=3, recurring=1, insights=2, savingTips=7**, data spanning **2026-05 → 2026-10**. The Lead then verified against the hosted API at **20:58 PKT**: admin login `200` (`role=admin`), student login `200` (`name=Ayesha Khan`), admin stats `activeUsers=22`/`totalTransactions=169`, student dashboard `income=26000`/`expense=10619`. The hosted *deploy* is still stale (old dashboard payload shape) until redeploy; the live data itself is confirmed. Fallback manual steps (if ever needed) are in [TEST_DATA.md §2.1](TEST_DATA.md).

---

## 7. CORS and custom domains

The allowed origins are hard-coded in `backend/api/index.js`:

```text
http://localhost:5173, http://localhost:5000, http://localhost:3001,
https://sfc-mindforge-frontend.vercel.app, https://sfc-mindforge-backend.vercel.app
```

- If you deploy the frontend to a different domain/preview URL, add that exact origin to the CORS allow-list and redeploy the backend.
- `FRONTEND_URL` (emails) and the CORS list are independent — update both when the frontend domain changes.

---

## 8. Verification checklist (hosted)

- [ ] `GET /health` → HTTP 200, `database.status = "Connected"`.
- [ ] Frontend home page loads; hard refresh works on deep links (`/dashboard`, `/admin/login`).
- [ ] Student login with demo credentials → dashboard with seeded data.
- [ ] Admin login → admin dashboard/statistics.
- [ ] Create a transaction; verify it appears after page reload (API persistence).
- [ ] Password reset email arrives and the link points at the **hosted** frontend (requires `FRONTEND_URL` + SMTP).
- [ ] Report share email arrives.
- [ ] Browser network tab shows no requests to `localhost`.
- [ ] Redeploy check: live bundle hash changed after deployment.

**Already verified during setup (2026-10-27 20:58 PKT):** demo seed executed against the configured Atlas DB (3 idempotent runs; users=3, transactions=131, budgets=3, recurring=1, insights=2, tips=7) and the hosted API accepted the admin (`200 role=admin`) and student (`200 name=Ayesha Khan`) credentials. Still to do: redeploy both projects with the latest code and confirm the new dashboard payload (`budgets`/`spendingBreakdown` no longer `null`), plus the email/manual-QA items.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `/health` returns 503 “Database connection failed” | Wrong `DBURI`, Atlas user/password, or IP allow-list. Check Atlas → Network Access and the connection string database name. |
| Frontend login says “Network Error” / CORS error | `VITE_API_URL` wrong, or frontend origin missing from the backend CORS allow-list. Fix and redeploy both. |
| 401 on every API call | Token missing/expired or signed with a different `JWT_SECRET` after changing env vars → log out/in (tokens are stateless; rotating the secret invalidates all sessions). |
| Changes not visible on the hosted site | Vercel deployment not triggered / serving old build → redeploy + hard refresh. |
| Deep links 404 on refresh | `frontend/vercel.json` rewrites missing/removed; restore them. |
| Password-reset email link opens localhost | `FRONTEND_URL` not set in Vercel backend env (code falls back to `http://localhost:5173`). |
| Emails not delivered | SMTP credentials wrong, Gmail blocking serverless IPs, or `NODE_ENV=production` + SMTP failure; check backend logs in Vercel. |
| Atlas `querySrv ECONNREFUSED` locally | Local DNS/network blocking SRV lookups — try another network/DNS (see §4.5), or run the seed from a machine where Atlas resolves. |
| `npm run seed` fails / refuses | When `NODE_ENV=production`, set `ALLOW_DEMO_SEED=true` for a deliberate demo seed; otherwise unset `NODE_ENV` and use the target `DBURI`. Confirm `seedCategories`/default categories exist first. |
| Backend returns 500 for every request after deploying | In production the server **fails fast if `JWT_SECRET` is missing** (`utils/jwt.js`, called at startup in `api/index.js`) — set `JWT_SECRET` in Vercel and redeploy. Check the function logs for “JWT_SECRET is required in production”. |
| Hosted dashboard shows empty budgets/spending widgets | The live deployment is older than the current code (old dashboard payload shape) — redeploy the backend **and** frontend, then hard-refresh. |

---

## 10. Security & operational notes

- Never commit `.env`; rotate `JWT_SECRET` and SMTP password if exposed. Rotating `JWT_SECRET` invalidates existing sessions (users must log in again).
- Use a dedicated Atlas user limited to the app database; do not reuse personal credentials.
- `NODE_ENV=production` removes the development-only fallback that returns a reset token when email sending fails, and makes a missing `JWT_SECRET` a **startup failure** rather than a silent insecure fallback.
- Auth endpoints (`/api/auth/register`, `/login`, `/forgot-password`, `/reset-password/:token`) are protected by a dependency-free, per-instance in-memory rate limiter (HTTP 429 + `Retry-After`). For strict global limits across serverless instances, a shared store (e.g. Redis) would be required.
- The API sends `helmet` security headers; CORS is restricted to the listed origins (no wildcard).
- For production hardening beyond coursework scope: move JWT storage to httpOnly cookies, add a shared-store rate limiter, and enable Atlas alerts/backups.
