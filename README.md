# FinSight AI

**AI-powered financial intelligence platform** for sector analysis, investment memos, company reports, and finance knowledge assessments.

Built with Next.js 15 (App Router), Prisma ORM, SQLite, Google Gemini 2.5 Flash, and Clerk authentication.

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier works)
- A [Clerk](https://dashboard.clerk.com) account (free tier works)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in your keys
cp .env.example .env

# 3. Push schema to SQLite (creates prisma/dev.db)
npx prisma db push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Database — no setup needed, SQLite file is auto-created
DATABASE_URL="file:./prisma/dev.db"

# Google Gemini AI — get from https://aistudio.google.com/apikey
GEMINI_API_KEY=your_key_here

# Clerk Auth — get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                   │
│              (App Router + React 19)            │
├──────────┬──────────────────────┬───────────────┤
│  Pages   │   Server Actions     │  Components   │
│ (server) │   (server, "use      │  (client,     │
│          │    server")          │    "use       │
│          │                      │    client")   │
├──────────┴──────────────────────┴───────────────┤
│              Prisma ORM + SQLite                │
│                (prisma/dev.db)                  │
├─────────────────────────────────────────────────┤
│          Google Gemini 2.5 Flash API            │
│         (structured JSON + markdown)            │
├─────────────────────────────────────────────────┤
│              Clerk Authentication               │
│        (middleware-protected routes)            │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Client Component → Server Action → auth() → Prisma/Gemini → Response
```

All protected routes go through Clerk middleware. Server Actions handle auth verification, database operations, and AI generation. Client components manage UI state and call server actions via the `useFetch` hook.

### Database Schema (5 models, unchanged)

| Model | Purpose |
|-------|---------|
| `User` | Analyst profile (sector, experience, skills, bio) |
| `IndustryInsight` | AI-generated sector analysis (cached per sector) |
| `InvestmentMemo` | Investment memo content (one per user) |
| `CompanyReport` | Company analysis reports (many per user) |
| `Assessment` | Finance quiz results with scores and AI tips |

### Key Technical Decisions

- **SQLite over PostgreSQL** — Zero-config local database. Single file at `prisma/dev.db`. Same Prisma API, no Docker needed.
- **Server Actions over REST** — Direct function calls from client to server with type safety. No API route boilerplate.
- **On-demand AI generation** — Sector insights are generated on first visit and cached for 7 days. No background jobs needed.
- **JSON + Markdown generation** — Gemini returns structured JSON for dashboards and markdown for documents, using explicit format instructions in prompts.

---

## Features

### 1. Sector Analysis Dashboard (`/dashboard`)

AI-generated financial sector intelligence with interactive Recharts visualizations.

- Sector outlook, growth rate, investment activity level
- Compensation benchmarks by role (bar chart)
- Key sector trends and recommended focus areas
- Data cached per sector, regenerated on demand

### 2. Investment Memo Builder (`/investment-memo`)

Structured document builder with form input, markdown editor, and PDF export.

- Sections: Analyst Contact, Executive Summary, Areas of Expertise, Analysis Experience, Education, Research
- AI enhancement per section (rewrites with financial language)
- Dual-mode editing: form view and raw markdown
- PDF export via html2pdf.js

### 3. Company Analysis Report (`/company-report`)

AI-generated structured analysis from company context.

- Input: company name, sector, description/financials
- Output: overview, strengths, risks, competitive positioning, outlook
- Markdown rendering and persistent storage
- Full CRUD (create, view, delete)

### 4. Finance Knowledge Assessment (`/assessment`)

Adaptive quiz system with performance tracking.

- 10 MCQs per assessment, tailored to user's sector and skills
- Explanations for each answer
- AI-generated study recommendations based on wrong answers
- Performance trend chart (line chart over time)
- Assessment history with drill-down review

---

## Project Structure

```
finsight-ai/
├── actions/                  # Server Actions (5 files, 14 functions)
│   ├── dashboard.js          # Sector analysis generation + retrieval
│   ├── assessment.js         # Quiz generation, scoring, assessments
│   ├── memo.js               # Memo save, retrieve, AI enhancement
│   ├── report.js             # Report generation + CRUD
│   └── user.js               # Profile update, onboarding status
├── app/
│   ├── (auth)/               # Clerk sign-in/sign-up pages
│   ├── (main)/               # Protected routes
│   │   ├── dashboard/        # Sector Analysis
│   │   ├── investment-memo/   # Investment Memo Builder
│   │   ├── company-report/    # Company Analysis Reports
│   │   ├── assessment/        # Finance Assessments
│   │   └── onboarding/       # Analyst profile setup
│   ├── lib/                  # Zod schemas + helpers
│   └── page.js               # Landing page
├── components/               # Shared components + shadcn/ui
├── data/                     # Static data (sectors, features, FAQs)
├── hooks/                    # useFetch custom hook
├── lib/                      # Prisma client, auth, utilities
├── prisma/                   # Schema + SQLite database file
└── public/                   # Static assets
```

---

## Useful Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npx prisma studio    # Visual database browser
npx prisma db push   # Sync schema to database
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.1.7 (App Router, Turbopack) |
| Language | JavaScript (React 19) |
| Database | SQLite via Prisma ORM 6.4 |
| AI | Google Gemini 2.5 Flash |
| Auth | Clerk |
| UI | shadcn/ui (Radix) + Tailwind CSS |
| Charts | Recharts |
| Editor | @uiw/react-md-editor |
| PDF | html2pdf.js |
| Validation | Zod + react-hook-form |
