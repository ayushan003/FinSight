# FinSight AI — Financial Intelligence Platform

AI-powered sector analysis platform with **real market data pipelines**, **adaptive assessments**, and **structured company reports**.

## What Makes This Different

**Real data, not hallucinations.** The dashboard pulls actual market data from Alpha Vantage, computes SMA/volatility/returns server-side, then uses AI only for narrative synthesis on top of real numbers.

**Adaptive assessments.** Questions are selected using an Elo-style ability rating system per topic. Missed questions resurface via spaced repetition. Quiz sessions are stored in the database with TTL expiry.

**Observable pipeline.** Data refresh streams progress to the client via Server-Sent Events — users see each stage (fetching → computing → narrating → done) in real time.

---

## Architecture

```
Client (Next.js App Router)
  │
  ├── Dashboard ─── SSE Stream ←── Pipeline Orchestrator
  │                                   ├── Alpha Vantage API (fetch)
  │                                   ├── Metrics Engine (compute SMA, volatility, returns)
  │                                   ├── Gemini API (narrate on real data)
  │                                   └── DataRefreshLog (status tracking)
  │
  ├── Assessment ─── Adaptive Engine
  │                    ├── Question Bank (DB, seeded via AI)
  │                    ├── Elo Selector (ability-targeted difficulty)
  │                    ├── Spaced Repetition (review scheduling)
  │                    └── QuizSession (DB-backed, TTL expiry)
  │
  └── Company Report ─── Gemini + Zod validation
```

---

## Required API Keys

| Key | Source | Free Tier |
|-----|--------|-----------|
| `DATABASE_URL` | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Yes |
| `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) | Yes (10K MAU) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard | Yes |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Yes (free tier) |
| `ALPHA_VANTAGE_API_KEY` | [Alpha Vantage](https://www.alphavantage.co/support/#api-key) | Yes (25 req/day) |
| `CRON_SECRET` | Any random string | N/A |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted)

### Steps

```bash
# 1. Clone
git clone <your-repo-url> && cd finsight-ai

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Fill in all keys listed above

# 4. Push database schema
npx prisma db push

# 5. Start dev server
npm run dev

# 6. Open http://localhost:3000
```

### First Use Flow
1. Sign up via Clerk
2. Complete onboarding (select sector + skills)
3. Go to Dashboard → Click "Fetch Market Data & Analyze"
4. Wait for SSE progress: fetching → computing → narrating → done
5. Dashboard populates with real metrics + AI narrative

---

## Run Tests

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest

# With coverage
npx vitest run --coverage
```

Tests cover:
- **Metrics computation** — SMA, volatility, returns (pure math)
- **Adaptive engine** — Elo updates, question scoring, spaced repetition intervals
- **Sector ETF mapping** — industry key parsing, all sectors mapped

---

## Environment Variables

Create `.env.local` with:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

GEMINI_API_KEY=your_gemini_api_key

ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

CRON_SECRET=any_random_secret_string
```

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard
# Enable Vercel Cron (Pro plan) for scheduled data refresh
```

The cron job at `/api/cron/refresh-data` runs daily at 6 AM UTC to refresh stale sector data.

---

## Project Structure

```
actions/              Server actions (auth-gated)
  ├── dashboard.js    Real data pipeline triggers
  ├── assessment.js   Adaptive quiz with DB sessions
  ├── report.js       Company report generation
  └── user.js         Profile management

lib/
  ├── pipeline/
  │   ├── fetcher.js      Alpha Vantage API integration
  │   ├── metrics.js      SMA, volatility, returns computation
  │   └── orchestrator.js Full fetch→compute→narrate pipeline
  ├── assessment/
  │   └── adaptive.js     Elo selector + spaced repetition
  ├── prisma.js
  └── checkUser.js

app/
  ├── api/
  │   ├── dashboard/refresh/route.js   SSE endpoint
  │   └── cron/refresh-data/route.js   Scheduled refresh
  ├── (main)/
  │   ├── dashboard/       Real metrics + AI narrative
  │   ├── assessment/      Adaptive quizzes + topic proficiency
  │   └── company-report/  Structured analysis reports
  └── (auth)/              Clerk sign-in/up

tests/
  ├── metrics.test.js      Computation unit tests
  ├── adaptive.test.js     Elo + spaced repetition tests
  └── sector-etfs.test.js  Mapping coverage tests

data/
  ├── industries.js        Sector definitions
  └── sector-etfs.js       Industry → ETF symbol mapping
```

---

## Tech Stack

Next.js 15 (App Router) · React 19 · Prisma (PostgreSQL) · Clerk Auth · Google Gemini AI · Alpha Vantage API · Recharts · Tailwind CSS · Vitest · Zod

---

## Key Technical Decisions

**Why Alpha Vantage over Yahoo Finance?** Stable API with clear rate limits, free tier sufficient for demo, returns clean JSON without scraping.

**Why Elo over IRT 2PL?** Simpler to implement, easier to explain in interviews, converges fast enough for a 50-question bank. Full IRT would require calibration data we don't have.

**Why SSE over WebSockets?** Unidirectional status updates don't need bidirectional channels. SSE works over standard HTTP, no upgrade negotiation, simpler to deploy on Vercel.

**Why DB sessions over in-memory Map?** Server restarts/redeployments clear memory. Quiz sessions with a 1-hour TTL in PostgreSQL survive deployments and are auditable.

---

## License

MIT
