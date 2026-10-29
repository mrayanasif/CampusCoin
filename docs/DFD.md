# Campus Coin — Data Flow Diagrams & Flowcharts

This document contains the SRS §1.9 design diagrams for Campus Coin:

1. Level-0 context diagram
2. Level-1 process decomposition
3. Flowcharts: registration/login/password reset, transaction lifecycle (including soft delete/restore), budget alert, report generation

All diagrams are written in [Mermaid](https://mermaid.js.org/) and render on GitHub/GitLab or any Mermaid-compatible Markdown viewer. They describe the implementation in this repository (`backend/api/index.js`, `backend/routes/*`, `backend/controllers/*`, `frontend/src/**`).

> **STUDENT TO WRITE:** in the final report, add a short explanation of each diagram in your own words (what the student/admin does, which process handles it, which data store is touched) — do not just paste the diagrams.

---

## 1. Level-0 context diagram

External entities: **Student**, **Administrator**, **SMTP Email Service** (for reset/report emails). The system under design is the Campus Coin web application (React SPA + Express API) with MongoDB Atlas as the data store.

```mermaid
flowchart LR
    STUD(["Student"])
    ADM(["Administrator"])
    SYS["Campus Coin Web Application<br/>React SPA + Express REST API"]
    DB[("MongoDB Atlas")]
    SMTP["SMTP Email Service"]

    STUD -->|"Register / login / reset password"| SYS
    STUD -->|"Record and edit income and expenses,<br/>import CSV, manage recurring entries"| SYS
    STUD -->|"Set budgets, view reports and exports,<br/>tips, insights, notes, bookmarks"| SYS
    SYS -->|"Balance, transactions, budgets,<br/>reports, tips, insights, notifications"| STUD

    ADM -->|"Admin login"| SYS
    ADM -->|"Manage users, default categories,<br/>tip templates, announcements, settings"| SYS
    SYS -->|"Usage statistics and management views"| ADM

    SYS -->|"Read / write users, transactions,<br/>categories, budgets, insights, tips,<br/>notes, notifications, activity logs"| DB
    DB -->|"Query results and aggregates"| SYS

    SYS -->|"Password-reset link,<br/>report email"| SMTP
    SMTP -->|"Email delivery"| STUD
    SMTP -->|"Email delivery"| ADM
```

---

## 2. Level-1 process decomposition

The API is split into six logical process groups. Data stores D1–D7 are the MongoDB collections (see [ERD.md](ERD.md)).

```mermaid
flowchart TB
    STUD(["Student"])
    ADM(["Administrator"])
    SMTP["SMTP Email Service"]

    subgraph P1["P1 Authentication and Session"]
        P11["Register / login / logout"]
        P12["JWT session check (protect middleware)"]
        P13["Forgot / reset password token"]
    end

    subgraph P2["P2 Transactions, CSV and Recurring"]
        P21["Add / edit / delete transaction"]
        P22["Soft delete, deleted list, restore"]
        P23["CSV preview + import with AI suggestions"]
        P24["Recurring CRUD + due-occurrence sweep"]
    end

    subgraph P3["P3 Budgets and Alerts"]
        P31["Create / edit / delete budget"]
        P32["Compute spend vs limit"]
        P33["Create budget warning / exceeded notification"]
    end

    subgraph P4["P4 Reports, Export and Email"]
        P41["Category / income-expense / daily / weekly / filtered reports"]
        P42["Browser PDF and PNG export"]
        P43["Email report summary"]
    end

    subgraph P5["P5 Tips and AI Insights"]
        P51["Generate personalised saving tips"]
        P52["Generate monthly narrative insight + flags"]
        P53["AI category suggestion and correction feedback"]
    end

    subgraph P6["P6 Admin Management"]
        P61["User view / disable / reset"]
        P62["Default categories, tip templates, announcements"]
        P63["Usage statistics"]
    end

    D1[("D1 users")]
    D2[("D2 categories")]
    D3[("D3 transactions")]
    D4[("D4 budgets")]
    D5[("D5 insights + tips + notes + bookmarks")]
    D6[("D6 notifications + activity logs")]
    D7[("D7 recurring + import batches + AI feedback")]
    D8[("D8 announcements + templates + settings")]

    STUD --> P11
    STUD --> P21
    STUD --> P31
    STUD --> P41
    STUD --> P52
    ADM --> P13
    ADM --> P6

    P11 --> D1
    P12 --> D1
    P13 --> D1
    P13 --> SMTP

    P21 --> D3
    P22 --> D3
    P23 --> D7
    P23 --> D3
    P24 --> D7
    P24 --> D3

    P31 --> D4
    P32 --> D3
    P32 --> D4
    P33 --> D6

    P41 --> D3
    P41 --> D2
    P42 --> STUD
    P43 --> SMTP

    P51 --> D5
    P51 --> D3
    P51 --> D4
    P52 --> D5
    P52 --> D3
    P53 --> D7
    P53 --> D2

    P61 --> D1
    P62 --> D2
    P62 --> D8
    P62 --> D6
    P63 --> D1
    P63 --> D3

    P52 --> D6
    P33 --> D6
```

---

## 3. Flowcharts

### 3.1 Registration, login and password reset

```mermaid
flowchart TD
    A(["Visitor"]) --> B{"Has an account?"}
    B -->|"No"| C["Open /register"]
    C --> D{"Name, valid email,<br/>password >= 6 chars?"}
    D -->|"No"| E["Show validation error"] --> C
    D -->|"Yes"| F["POST /api/auth/register"] --> G[("users")]
    G --> H["JWT + public user returned"]
    H --> I["Redirect to /login"]

    B -->|"Yes"| J["Open /login"]
    J --> K{"POST /api/auth/login<br/>valid credentials?"}
    K -->|"No"| L["401 Invalid credentials"] --> J
    K -->|"Yes"| M{"Role = admin?"}
    M -->|"Yes"| N["Redirect to /admin/dashboard"]
    M -->|"No"| O["Redirect to /dashboard"]

    J --> P["Forgot password link"]
    P --> Q["POST /api/auth/forgot-password"]
    Q --> R["Invalidate old tokens,<br/>create PasswordResetToken"]
    R --> S["Send email with FRONTEND_URL/reset-password?token=..."]
    S --> T["Open /reset-password?token=..."]
    T --> U{"Token exists, unused,<br/>not expired (1 hour)?"}
    U -->|"No"| V["Show invalid/expired message"]
    U -->|"Yes"| W["POST /api/auth/reset-password/:token"]
    W --> X["bcrypt hash new password,<br/>mark token used"] --> I
```

### 3.2 Transaction lifecycle (add, edit, delete, soft delete, restore)

```mermaid
flowchart TD
    A(["Student on /transactions"]) --> B{"Action"}
    B -->|"Add"| C["Open transaction modal"]
    C --> D{"Valid type, amount > 0,<br/>category, date?"}
    D -->|"No"| E["Show validation error"] --> C
    D -->|"Yes"| F["POST /api/transactions"] --> G[("transactions")]
    G --> H["Async budget-alert check"]

    B -->|"Edit"| I["Prefilled edit modal"]
    I --> J["PUT /api/transactions/:id"] --> G
    J --> H

    B -->|"Delete"| K["Confirm delete"]
    K --> L["DELETE /api/transactions/:id"]
    L --> M["Set deletedAt = now<br/>(soft delete, history retained)"]
    M --> G
    M --> N["Excluded from dashboard,<br/>reports, budgets, insights"]

    B -->|"Deleted tab"| O["GET /api/transactions/deleted"]
    O --> G
    O --> P["Deleted transactions list"]
    P -->|"Restore"| Q["POST /api/transactions/:id/restore"]
    Q --> R["Clear deletedAt"]
    R --> G
    R --> H
```

### 3.3 Budget alert

```mermaid
flowchart TD
    A(["Transaction created, edited,<br/>restored or recurring materialised"]) --> B["Look up active budget<br/>for user + category + current month"]
    B --> C{"Budget exists?"}
    C -->|"No"| D["No alert"]
    C -->|"Yes"| E["Sum current-month expenses<br/>where deletedAt = null"]
    E --> F["percent = spent / limitAmount * 100"]
    F --> G{"percent >= 100?"}
    G -->|"Yes"| H["Create or update notification<br/>type budget_exceeded"]
    G -->|"No"| I{"percent >= alertPercentage?"}
    I -->|"Yes"| J["Create or update notification<br/>type budget_warning"]
    I -->|"No"| K["No notification"]
    H --> L[("notifications")]
    J --> L
    L --> M["Bell badge + /notifications page<br/>and POST /api/notifications/refresh-budget-alerts"]
```

### 3.4 Report generation, export and sharing

```mermaid
flowchart TD
    A(["Student on /reports"]) --> B["Choose filters:<br/>date range, category / income source, type"]
    B --> C["GET /api/reports/filter,<br/>/daily, /weekly, /income-expense"]
    C --> D[("transactions")]
    D --> E["Aggregate totals + render charts<br/>(category pie, 6-month trend, daily, weekly)"]
    E --> F{"Output"}
    F -->|"PDF"| G["html2canvas capture + jsPDF<br/>download PDF"]
    F -->|"Image"| H["html2canvas capture<br/>download PNG"]
    F -->|"Email"| I["POST /api/reports/share/email"]
    I --> J["Nodemailer + FRONTEND_URL"]
    J --> K["Report summary email"]
    F -->|"Server export routes"| L["GET /api/reports/export/pdf<br/>or /export/image returns 501<br/>(browser export is the shipped path)"]
```

---

## 4. Reading the diagrams in the report

| Diagram | SRS deliverable | Where the behaviour lives |
|---|---|---|
| Level-0 | Context / scope | `backend/api/index.js` route mounting, `frontend/src/App.jsx` |
| Level-1 | Process decomposition | `backend/routes/*`, `backend/controllers/*`, `backend/services/*` |
| 3.1 Auth | Flowchart for registration/login/reset | `controllers/auth.controller.js`, `pages/Auth/*` |
| 3.2 Transactions | Flowchart for logging + history | `controllers/transaction.controller.js`, `pages/Transactions/Transactions.jsx` |
| 3.3 Budget alert | Flowchart for alerts | `services/budgetAlert.service.js`, `controllers/budget.controller.js` |
| 3.4 Reports | Flowchart for report generation | `controllers/report.controller.js`, `pages/Reports/Reports.jsx` |

> **STUDENT TO WRITE:** for the academic report, draw/export these diagrams (Mermaid editor → PNG/SVG or draw in draw.io) and write a paragraph per diagram describing the flow and design decisions. The report must not contain source code (SRS §1.9).
