# **[FinSight AI](https://finsight-pied.vercel.app/)**

**AI-powered financial intelligence platform** for sector analysis, investment memos, company reports, and finance knowledge assessments.
> Built with Next.js 15, Prisma + PostgreSQL, Google Gemini 2.5 Flash, Clerk Auth

![FinSight Dashboard](https://raw.githubusercontent.com/ayushan003/FinSight/main/public/Dash.png)
---

## What I Built & Why

FinSight AI is a full-stack financial intelligence platform that uses AI to generate structured sector analysis, company reports, investment memos, and adaptive knowledge assessments — all personalized to the user's financial sector and expertise.

**Key technical decisions:**

- **Server Actions over REST** — Direct function calls from client to server with built-in type safety. Eliminates API route boilerplate while keeping auth verification and Zod validation server-side.
- **Server-side score computation** — Assessment quiz scores are computed on the server from raw answers, not trusted from the client. This prevents score tampering while keeping the UX responsive.
- **On-demand AI caching** — Sector insights are generated via Gemini on first visit, cached in PostgreSQL, and automatically regenerated after 7 days. Balances API costs against data freshness without background jobs.
- **Dual-layer validation** — Zod schemas validate on the client for instant UX feedback, then the same schemas re-validate on the server in every action to prevent malformed data from reaching the database.

---

## Features

### 1. Sector Analysis Dashboard (`/dashboard`)
AI-generated financial sector intelligence with interactive Recharts visualizations — sector outlook, growth rate, compensation benchmarks by role (bar chart), key trends, and recommended focus areas. Data cached per sector, regenerated on demand.

### 2. Investment Memo Builder (`/investment-memo`)
Structured document builder with form input, markdown editor (MDEditor), and PDF export (html2pdf.js). Includes AI enhancement per section that rewrites content with financial language. Dual-mode editing: form view and raw markdown.

### 3. Company Analysis Report (`/company-report`)
AI-generated structured analysis from company context — overview, strengths, risks, competitive positioning, outlook. Full CRUD with markdown rendering and persistent storage.

### 4. Finance Knowledge Assessment (`/assessment`)
Adaptive quiz system with 10 MCQs per assessment, tailored to user's sector and skills. Explanations for each answer, AI-generated study recommendations based on wrong answers, performance trend chart over time, and assessment history with drill-down review.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack, Server Actions) |
| Language | JavaScript (React 19) |
| Database | PostgreSQL via Prisma ORM |
| AI | Google Gemini 2.5 Flash (structured JSON + markdown generation) |
| Auth | Clerk (middleware-protected routes) |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS |
| Charts | Recharts |
| Editor | @uiw/react-md-editor |
| PDF | html2pdf.js |
| Validation | Zod (client + server) + react-hook-form |
| Deployment | Vercel + Neon PostgreSQL |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                │
│                                                         │
│  Pages (SSR)  ←→  Server Actions ("use server")         │
│  Components (CSR) ←→  useFetch hook                     │
├─────────────────────────────────────────────────────────┤
│              Prisma ORM + PostgreSQL (Neon)             │
│         5 models · native JSON · indexed queries        │
├─────────────────────────────────────────────────────────┤
│              Google Gemini 2.5 Flash API                │
│          structured JSON + markdown generation          │
├─────────────────────────────────────────────────────────┤
│                 Clerk Authentication                    │
│           middleware-protected routes + sync            │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:** `User Action → Client Component → Server Action → auth() + Zod validation → Prisma/Gemini → Response`

### Database Schema (5 models)

| Model | Purpose |
|-------|---------|
| `User` | Analyst profile (sector, experience, skills, bio) |
| `IndustryInsight` | AI-generated sector analysis (cached per sector, 7-day TTL) |
| `InvestmentMemo` | Investment memo content (one per user) |
| `CompanyReport` | Company analysis reports (many per user) |
| `Assessment` | Finance quiz results with scores and AI tips |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier works)
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier works)
- A [Clerk](https://dashboard.clerk.com) account (free tier works)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in your keys
cp .env.example .env

# 3. Push schema to database
npx prisma db push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Database — PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Google Gemini AI
GEMINI_API_KEY=your_key_here

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## Project Structure

```
├── actions/                  # Server Actions (5 files)
│   ├── dashboard.js          # Sector analysis generation + cache refresh
│   ├── assessment.js         # Quiz generation, server-side scoring
│   ├── memo.js               # Memo save, retrieve, AI enhancement
│   ├── report.js             # Report generation + CRUD
│   └── user.js               # Profile update with Zod validation
├── app/
│   ├── (auth)/               # Clerk sign-in/sign-up pages
│   ├── (main)/               # Protected routes
│   │   ├── dashboard/        # Sector Analysis
│   │   ├── investment-memo/  # Investment Memo Builder
│   │   ├── company-report/   # Company Analysis Reports
│   │   ├── assessment/       # Finance Assessments
│   │   └── onboarding/       # Analyst profile setup
│   ├── error.jsx             # Global error boundary
│   ├── lib/                  # Zod schemas + helpers
│   └── page.js               # Landing page
├── components/               # Shared components + shadcn/ui
├── data/                     # Static data (sectors, features, FAQs)
├── hooks/                    # useFetch custom hook
├── lib/                      # Prisma client, auth, utilities
├── prisma/                   # Schema
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
