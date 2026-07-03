# IndieBoost

AI-Powered Growth Execution Platform for indie developers. Get your first users using AI growth agents — starting at $5/campaign.

## Architecture

3 independent modules:
- **frontend/** — Next.js App Router + TailwindCSS (port 3000)
- **backend/** — Cloudflare Workers + Hono + D1 (port 8787)
- **agent/** — Local Node.js daemon, communicates via Backend API

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.
See [AI.md](./AI.md) for agent developer guide.

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx wrangler d1 execute indieboost-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute indieboost-db --local --file=./migrations/0002_seed.sql
npm run dev
# → http://localhost:8787
```

### 2. Agent Daemon

```bash
cd agent
npm install
npm start
# → Polls backend every 3s, processes pending executions
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Usage Flow

1. Open http://localhost:3000 → Landing page
2. Click "Start Campaign" → Fill in product URL, goal, budget
3. Click "Generate Growth Plan" → Redirects to dashboard
4. Click "Start Campaign" on dashboard → Backend creates pending agent executions
5. Agent daemon picks them up → Runs simulations → Writes results
6. View dashboard for real-time agent status
7. Click "View Detailed Results" for ROI breakdown

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign + executions |
| POST | `/api/campaigns/:id/start` | Launch campaign |
| GET | `/api/campaigns/:id/results` | Aggregated results + ROI |
| GET | `/api/executions/pending` | (Internal) Agent poll endpoint |
| POST | `/api/executions/:id/complete` | (Internal) Agent submit endpoint |
| POST | `/api/track/event` | Record tracking event |

## Database

SQLite via Cloudflare D1. Schema covers:
- **executors** — AI agents + future human creators
- **users** — Demo user for MVP (no auth)
- **products** — User's SaaS products
- **campaigns** — Marketing campaigns ($5–$100)
- **agent_executions** — Per-executor campaign execution records
- **event_tracking** — Time-series event log for attribution

## Agent Types

| Agent | Category | Profile |
|-------|----------|---------|
| SEO Agent | seo | High volume, low conversion |
| Reddit Agent | reddit | Medium volume, medium conversion |
| Twitter Agent | twitter | Lower volume, engaged audience |
| Newsletter Agent | newsletter | Low volume, highest conversion |
