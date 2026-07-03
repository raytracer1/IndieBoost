# IndieBoost Architecture

## Overview

IndieBoost is a Growth Execution Platform for indie developers to promote their SaaS products using AI agents. The system has 3 independent modules:
- **frontend** — Next.js App Router + TailwindCSS (port 3000)
- **backend** — Node.js + Express REST API (port 3001)
- **agent** — Independent daemon process (no port, SQLite polling)

## Module Communication

```
┌──────────────┐     HTTP/REST      ┌──────────────┐     SQLite      ┌──────────────┐
│   frontend   │ ──────────────────> │   backend    │ ──────────────> │   SQLite     │
│  (port 3000) │ <────────────────── │  (port 3001) │                │   (file)     │
└──────────────┘                     └──────────────┘                └──────────────┘
                                                                           ^
                                                                           │ SQLite
                                                                           │ (same file)
                                                                     ┌──────────────┐
                                                                     │    agent     │
                                                                     │  (daemon)    │
                                                                     └──────────────┘
```

**Key rule**: Backend and Agent **never** import each other's code. They communicate only through the shared SQLite database file.

## Project Structure

```
IndieBoost/
├── ARCHITECTURE.md           # This file
├── AI.md                     # Agent developer guide
├── README.md
│
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Express server entry (port 3001)
│   │   ├── db.js             # SQLite connection + schema init
│   │   └── routes/
│   │       ├── campaigns.js  # POST/GET campaigns, POST start
│   │       ├── results.js    # GET results + ROI computation
│   │       └── track.js      # POST track/event
│   └── data/                 # SQLite DB file (gitignored)
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── app/
│   │   ├── layout.tsx        # Root layout with nav + Tailwind
│   │   ├── page.tsx          # Landing page
│   │   ├── create/
│   │   │   └── page.tsx      # Create Campaign form
│   │   ├── campaign/
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # Campaign Dashboard
│   │   │       └── results/
│   │   │           └── page.tsx  # Results + ROI page
│   │   └── globals.css
│   └── components/
│       ├── Navbar.tsx
│       ├── AgentCard.tsx
│       ├── MetricTile.tsx
│       ├── CampaignForm.tsx
│       ├── ROIBreakdown.tsx
│       └── AttributionChart.tsx
│
└── agent/
    ├── package.json
    └── src/
        ├── index.js          # Daemon entry: poll + dispatch
        ├── db.js             # SQLite connection (same DB file)
        ├── seo.js
        ├── reddit.js
        ├── twitter.js
        └── newsletter.js
```

## Database Schema

### Entity-Relationship

```
executors ──┐
  id         │  executor_id
  name       │
  type       │  (ai | human)
  category   │  (seo | reddit | twitter | newsletter)
             │
users ────< products ────< campaigns ────< agent_executions ────< event_tracking
  id          id            id              id                     id
  email       user_id       product_id      campaign_id            campaign_id
              url           budget          executor_id            executor_id
              name          goal            status                 event_type
                            status          cost                   source
                                            visits                 timestamp
                                            signups
                                            conversions
```

### Tables

#### executors — Execution capability registry
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT | Display name, e.g. "SEO Agent" |
| type | TEXT | `ai` or `human` |
| category | TEXT | `seo`, `reddit`, `twitter`, `newsletter`, ... |
| is_active | INTEGER | 1 = active, 0 = disabled |
| created_at | TEXT | |

MVP seeds 4 AI executors. Future human creators (influencers, affiliates) are added as new rows with `type='human'`.

#### users — Platform users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| email | TEXT UNIQUE | Default: `demo@indieboost.io` |
| created_at | TEXT | |

MVP uses a single demo user (id=1). No auth system.

#### products — User's SaaS products
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id |
| url | TEXT | Product URL |
| name | TEXT | Auto-detected or manually entered |
| description | TEXT | Optional |
| created_at | TEXT | |

#### campaigns — Marketing campaigns
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| product_id | INTEGER FK | → products.id |
| budget | REAL | $5–$100 |
| goal | TEXT | `signups`, `visits`, or `waitlist` |
| status | TEXT | `draft` → `running` → `completed` |
| created_at | TEXT | |

#### agent_executions — Per-executor campaign execution records
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| campaign_id | INTEGER FK | → campaigns.id |
| executor_id | INTEGER FK | → executors.id |
| status | TEXT | `pending` → `running` → `completed` / `failed` |
| cost | REAL | Actual spend for this execution |
| visits | INTEGER | Traffic generated |
| signups | INTEGER | Signups generated |
| conversions | INTEGER | Conversions generated |
| notes | TEXT | Human-readable execution summary |
| started_at | TEXT | |
| completed_at | TEXT | |

#### event_tracking — Time-series event log
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| campaign_id | INTEGER FK | → campaigns.id |
| executor_id | INTEGER FK | → executors.id (nullable) |
| event_type | TEXT | `visit`, `signup`, or `conversion` |
| source | TEXT | Denormalized executor.category for queries |
| timestamp | TEXT | |

## State Machine

### Campaign Lifecycle
```
draft ──(POST /start)──> running ──(all executions completed)──> completed
```

### Agent Execution Lifecycle
```
pending ──(agent daemon picks up)──> running ──(simulation done)──> completed
                                          └──(error)──> failed
```

## API Reference

All endpoints are prefixed with `/api`. Backend runs on port 3001.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/campaigns` | Create a campaign (auto-creates user + product) |
| GET | `/api/campaigns/:id` | Get campaign with product info + all executions |
| POST | `/api/campaigns/:id/start` | Set status=running, create agent_execution rows (pending) |
| GET | `/api/campaigns/:id/results` | Aggregated analytics + ROI per executor |
| POST | `/api/track/event` | Record an event (used by agent daemon) |

### POST /api/campaigns

Request:
```json
{
  "url": "https://myapp.com",
  "name": "MyApp",
  "goal": "signups",
  "budget": 50
}
```
- `name` is optional; if omitted, domain is extracted from URL.
- `goal` must be one of: `signups`, `visits`, `waitlist`.
- `budget` is in dollars, range $5–$100.

Response (201):
```json
{
  "id": 1,
  "product_id": 1,
  "budget": 50,
  "goal": "signups",
  "status": "draft",
  "product": { "id": 1, "url": "https://myapp.com", "name": "MyApp" },
  "created_at": "2026-07-03T12:00:00.000Z"
}
```

### POST /api/campaigns/:id/start

Response (200):
```json
{
  "id": 1,
  "status": "running",
  "agents": [
    { "id": 1, "executor_id": 1, "executor_name": "SEO Agent", "status": "pending" },
    { "id": 2, "executor_id": 2, "executor_name": "Reddit Agent", "status": "pending" },
    { "id": 3, "executor_id": 3, "executor_name": "Twitter Agent", "status": "pending" }
  ]
}
```
Backend selects 2-4 active executors, splits budget, and writes pending rows. The agent daemon takes over from here.

### GET /api/campaigns/:id/results

Response (200):
```json
{
  "campaign_id": 1,
  "budget": 50,
  "goal": "signups",
  "status": "completed",
  "totals": {
    "visits": 1240,
    "signups": 83,
    "conversions": 12,
    "total_cost": 50
  },
  "roi": {
    "cost_per_signup": 0.60,
    "cost_per_visit": 0.04
  },
  "agents": [
    {
      "executor_id": 1,
      "executor_name": "SEO Agent",
      "category": "seo",
      "status": "completed",
      "cost": 12.5,
      "visits": 500,
      "signups": 20,
      "conversions": 3,
      "notes": "Generated 5 blog posts targeting 3 keywords. 500 organic visits."
    }
  ],
  "attribution": {
    "seo":       { "visits": 500, "signups": 20 },
    "reddit":    { "visits": 350, "signups": 30 },
    "twitter":   { "visits": 240, "signups": 18 },
    "newsletter":{ "visits": 150, "signups": 15 }
  }
}
```

## Data Flow

1. **User** fills form on frontend → POST `/api/campaigns` → backend creates user, product, campaign rows.
2. **User** clicks "Start" → POST `/api/campaigns/:id/start` → backend sets campaign status=`running`, selects executors, creates `agent_executions` rows (status=`pending`).
3. **Agent daemon** polls `agent_executions WHERE status='pending'` → for each, updates to `running`, executes simulation, writes results back with status=`completed`, inserts `event_tracking` rows.
4. When all executions for a campaign are completed → agent daemon sets campaign status=`completed`.
5. **Frontend** fetches `/api/campaigns/:id/results` → backend aggregates `agent_executions` + `event_tracking` to compute ROI and attribution.

## Design Decisions

1. **SQLite (better-sqlite3)**: Single-file DB, zero setup, synchronous API. Perfect for MVP scale.
2. **No ORM**: 5 tables, raw SQL is simpler and more transparent.
3. **Backend ↔ Agent decoupled via DB**: No code dependencies. Agent is independently deployable.
4. **executors table**: Separates "who can execute" from "what was executed". Enables future human creators without schema changes.
5. **No authentication**: Single demo user. Auth can be added later without data model changes.
6. **Synchronous simulation**: Agent daemon runs locally, simulations take <100ms. No message queue needed for MVP.
7. **Denormalized `source` on event_tracking**: Avoids JOIN to executors for common attribution queries.
