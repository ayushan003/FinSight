# FinSight AI — Deterministic Financial Analysis Platform

A financial intelligence platform that computes real market metrics from raw price data, detects anomalies via rolling Z-scores, and uses AI only for narrative synthesis on verified numbers — never for data generation.

**Core principle:** AI explains data. It does not invent data.

---

## What This System Actually Computes

| Component | Input | Computation | Output |
|-----------|-------|-------------|--------|
| **Market Pipeline** | Raw OHLCV from Alpha Vantage | SMA-20, SMA-50, 30d annualized volatility (log-return σ × √252), YTD/MTD returns | `ComputedMetrics` table |
| **Anomaly Detector** | Daily close prices | Rolling 30-day Z-score on log returns, ±2σ threshold | `MarketAnomaly` table with direction, magnitude, Z-score |
| **Sector Classification** | Computed SMA crossover + return momentum | SMA20 > SMA50 + positive MTD → Positive; inverse → Negative | Outlook and demand level (deterministic, not AI) |
| **Adaptive Quiz** | User response history | Elo rating update: `ability += (K/100) × (actual − expected)` where `expected = 1/(1+10^((difficulty−ability)×4))` | Per-topic ability scores, spaced repetition schedule |
| **AI Narrative** | All computed metrics + detected anomalies | Structured prompt with real numbers → Gemini → validated output | Narrative that references actual SMA, volatility, Z-scores |

---

## Architecture

```
Alpha Vantage API
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Data Pipeline (lib/pipeline/)                      │
│                                                     │
│  fetcher.js ──→ MarketDataPoint table (raw OHLCV)   │
│       │                                             │
│  metrics.js ──→ SMA-20/50, volatility, returns      │
│       │          (pure math, zero AI)               │
│       │                                             │
│  anomaly.js ──→ Rolling Z-score anomaly detection   │
│       │          flags ±2σ moves as moderate/extreme│
│       │                                             │
│  orchestrator.js ──→ Stages: fetch → compute →      │
│                      detect → narrate               │
│                      Status streamed via SSE        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              Gemini receives ONLY:
              - Computed SMA values
              - Computed volatility
              - Computed returns
              - Detected anomalies with Z-scores
              
              Gemini MUST reference these numbers.
              It cannot invent market context.
```

```
Quiz Engine (lib/assessment/)
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  Adaptive Assessment                                  │
│                                                       │
│  Question Bank ──→ 50 questions per sector            │
│       │             stored in DB, not generated       │
│       │             per-quiz                          │
│       │                                               │ 
│  Elo Selector ──→ Score each question by:             │
│       │           difficultyMatch = 1 - |d - ability| │
│       │           + reviewBoost (2.0 for due items)   │
│       │           + topic diversity cap (≤3/topic)    │
│       │                                               │
│  Spaced Repetition ──→ Wrong answers scheduled for    │
│       │                 review at 2^n day intervals   │
│       │                 (capped at 30 days)           │ 
│       │                                               │
│  QuizSession ──→ DB-backed with 1hr TTL               │
│                  Server-side grading only             │
│                  Correct answers never sent to client │
└───────────────────────────────────────────────────────┘
```

---

## Anomaly Detection — Validated Against Real Data

The anomaly detector computes a rolling 30-day Z-score on daily log returns for sector ETFs. When a day's return exceeds ±2σ from the rolling mean, it's flagged.

**Detection on Fixed Income sector (LQD ETF):**

| Date | Daily Return | Z-Score | Direction | What Happened |
|------|-------------|---------|-----------|---------------|
| Mar 20, 2026 | -1.23% | -2.6 | Drop | Fed held rates, hawkish guidance pushed bond yields up |
| Mar 11, 2026 | -0.82% | -2.4 | Drop | CPI data above expectations, rate cut hopes faded |
| Mar 10, 2026 | -0.69% | -2.3 | Drop | Spillover from equity selloff into credit markets |
| Mar 9, 2026 | +0.60% | +2.2 | Spike | Flight-to-quality bid after banking sector weakness |
| Mar 2, 2026 | -0.68% | -2.4 | Drop | Treasury auction weak demand, yield curve steepened |

The detector correctly flags macro-driven moves. Anomalies are fed into the AI narrative prompt so the analysis explains observed events rather than hallucinating market context.

---

## Key Technical Decisions

**Why compute metrics server-side instead of using AI?**
AI-generated financial numbers are unverifiable. Our SMA, volatility, and returns are computed from raw OHLCV data using standard formulas — log-return standard deviation × √252 for annualized volatility, arithmetic mean for SMA. Every number on the dashboard traces back to a data point in the database.

**Why Elo over IRT for adaptive difficulty?**
Item Response Theory (2PL/3PL) requires calibration data from hundreds of test-takers to estimate item discrimination parameters. With a freshly seeded question bank, we don't have that data. Elo converges in 5-10 attempts per topic with a single parameter (ability), making it appropriate for cold-start conditions.

**Why SSE over WebSockets for pipeline progress?**
The pipeline streams unidirectional status updates (fetch → compute → detect → narrate → done). SSE works over standard HTTP with no upgrade negotiation, deploys cleanly on Vercel, and the client uses native `ReadableStream` — no library needed.

**Why DB-backed quiz sessions instead of in-memory state?**
Server restarts and Vercel cold starts clear memory. A `QuizSession` row with a 1-hour TTL in PostgreSQL survives deployments. The session stores ordered question IDs server-side; the client receives only question text and options — correct answers are never transmitted.

**Why rolling Z-score for anomaly detection?**
Z-score normalizes daily returns against the recent volatility regime. A -1% day on a low-volatility ETF (σ=0.3%) is a 3σ event. The same -1% on a high-volatility ETF (σ=1.5%) is noise. The rolling window adapts the threshold automatically — no manual tuning per sector.

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon.tech or Supabase — both free)

### Required API Keys (all free tier)

| Key | Source |
|-----|--------|
| `DATABASE_URL` | [Neon](https://neon.tech) or [Supabase](https://supabase.com) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk](https://clerk.com) |
| `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ALPHA_VANTAGE_API_KEY` | [Alpha Vantage](https://www.alphavantage.co/support/#api-key) |
| `CRON_SECRET` | Any random string |

### Steps

```bash
git clone https://github.com/ayushan003/FinSight && cd FinSight
npm install

# Create .env.local and fill in keys
nano .env.local

npx prisma db push
npm run dev
# Open http://localhost:3000
```

### First Use
1. Sign up → Complete onboarding (select sector)
2. Dashboard → Click **"Fetch Market Data & Analyze"**
3. Watch SSE stream: fetching → computing → detecting anomalies → narrating → done
4. Go to Assessment → Start quiz (question bank seeds automatically)
5. After quiz, check Topic Proficiency panel (Elo ratings update per topic)

---

## Run Tests

```bash
npx vitest run              # 42 tests
npx vitest run --coverage   # with coverage report
```

**Test coverage:**
- `tests/metrics.test.js` — SMA computation, volatility (stable vs volatile), returns, edge cases (insufficient data, single element)
- `tests/adaptive.test.js` — Elo expected score symmetry, ability convergence over 20 iterations, clamping to [0,1], spaced repetition intervals, question scoring with review boost
- `tests/anomaly.test.js` — Z-score spike/drop detection, extreme vs moderate classification, zero-variance handling, percentage output verification
- `tests/sector-etfs.test.js` — All 10 industry mappings, compound key parsing, null input handling

---

## Project Structure

```
actions/                    Server actions (auth-gated)
├── dashboard.js            Pipeline trigger + anomaly fetch
├── assessment.js           Adaptive quiz with DB sessions + Elo
├── report.js               Company reports with injected real metrics
└── user.js                 Profile management

lib/pipeline/               Data pipeline (zero AI in compute layer)
├── fetcher.js              Alpha Vantage API → MarketDataPoint table
├── metrics.js              SMA, volatility, returns (pure math)
├── anomaly.js              Rolling Z-score anomaly detector
└── orchestrator.js         Pipeline stages + SSE status logging

lib/assessment/
└── adaptive.js             Elo selector + spaced repetition + seeding

app/api/
├── dashboard/refresh/      SSE endpoint streaming pipeline progress
└── cron/refresh-data/      Scheduled refresh (CRON_SECRET gated)

tests/                      42 unit tests (Vitest)
├── metrics.test.js
├── adaptive.test.js
├── anomaly.test.js
└── sector-etfs.test.js
```

---

## Tech Stack

Next.js 15 (App Router) · React 19 · PostgreSQL · Prisma ORM · Clerk Auth · Google Gemini · Alpha Vantage API · Recharts · Tailwind CSS · Vitest · Zod


---

## License

MIT
