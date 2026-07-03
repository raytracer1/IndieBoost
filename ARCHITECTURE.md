# IndieBoost Architecture

## Overview

IndieBoost is a Growth Execution Platform for indie developers to promote their SaaS products using AI agents. The system has 3 independent modules:
- **frontend** — Next.js App Router + TailwindCSS (port 3000)
- **backend** — Cloudflare Workers + Hono + D1 (port 8787)
- **agent** — Local Node.js daemon, communicates via Backend API

## Module Communication

```
┌──────────────┐     HTTP/REST       ┌──────────────┐     D1 bind    ┌──────────────┐
│   frontend   │ ──────────────────> │   backend    │ ──────────────>│  D1 (SQLite) │
│  (port 3000) │ <────────────────── │  (port 8787) │                │              │
└──────────────┘                     └──────────────┘                └──────────────┘
                                           ^
                                           │ HTTP (poll API)
                                           │
                                     ┌──────────────┐
                                     │    agent     │
                                     │  (daemon)    │
                                     └──────────────┘
```

**Key rule**: Backend and Agent **never** import each other's code. Agent polls Backend API for pending executions.

## Authentication — Google OAuth

```
User Browser              Frontend (3000)          Backend (8787)         Google
    |                          |                        |                    |
    |-- Click Sign In -------->|                        |                    |
    |                          |-- Redirect ----------->|                    |
    |                          |   /api/auth/google     |-- 302 redirect -->|
    |<-- Google OAuth page ----|                        |                    |
    |   user authorizes        |                        |                    |
    |-- callback with code --->|                        |                    |
    |                          |   /api/auth/google/    |                    |
    |                          |   callback?code=xxx    |-- exchange code -->|
    |                          |                        |<-- tokens ---------|
    |                          |                        |-- get user info -->|
    |                          |                        |<-- profile --------|
    |                          |                        |-- upsert user      |
    |                          |                        |-- create JWT       |
    |                          |<-- redirect token=xxx -|                    |
    |                          |                        |                    |
    |   /auth/callback?token=  |                        |                    |
    |   store in localStorage  |                        |                    |
    |   redirect to /create    |                        |                    |
    |                          |                        |                    |
    |-- API calls ------------>|                        |                    |
    |   Authorization: Bearer  |-- verify JWT --------->|                    |
    |                          |<-- user ok             |                    |
```

### JWT Flow
- Backend issues HS256 JWT (7 day expiry) after Google OAuth
- Frontend stores token in `localStorage` under `indieboost_token`
- All protected API calls include `Authorization: Bearer <token>` header
- Backend `requireAuth` middleware validates JWT, extracts user, sets on context
- Campaigns are user-scoped: each user only sees their own data

### Configuration
Set Google OAuth credentials in `backend/.dev.vars` (local) or `wrangler.jsonc` vars / Cloudflare Dashboard secrets:
```
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback
```

Set up in Google Cloud Console:
1. Create OAuth 2.0 Client ID (Web application)
2. Add `http://localhost:8787/api/auth/google/callback` to Authorized redirect URIs
3. Add `http://localhost:3000` to Authorized JavaScript origins

## Project Structure

```
IndieBoost/
├── ARCHITECTURE.md           # This file
├── AI.md                     # Agent developer guide
├── README.md
│
├── backend/                  # Cloudflare Workers
│   ├── wrangler.jsonc        # D1 binding + env vars
│   ├── .dev.vars             # Local secrets (gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_seed.sql
│   │   └── 0003_google_oauth.sql
│   └── src/
│       ├── index.ts          # Hono app entry
│       ├── middleware/
│       │   └── auth.ts       # JWT create/verify + auth middleware
│       └── routes/
│           ├── auth.ts       # GET /api/auth/google, /callback, /me
│           ├── campaigns.ts  # POST/GET campaigns (protected)
│           ├── results.ts    # GET results + ROI (protected)
│           ├── track.ts      # POST /api/track/event
│           └── executions.ts # GET pending, POST complete (agent daemon)
│
├── frontend/                 # Next.js + TailwindCSS
│   ├── app/
│   │   ├── layout.tsx        # Root layout + AuthProvider
│   │   ├── page.tsx          # Landing page
│   │   ├── create/page.tsx   # Create Campaign (with auth gate)
│   │   ├── campaign/[id]/
│   │   │   ├── page.tsx      # Campaign Dashboard
│   │   │   └── results/
│   │   │       └── page.tsx  # Results + ROI
│   │   └── auth/callback/
│   │       └── page.tsx      # OAuth callback handler
│   └── components/
│       ├── AuthContext.tsx    # Auth state, token management
│       ├── Navbar.tsx        # Nav with login/logout
│       ├── AgentCard.tsx
│       ├── MetricTile.tsx
│       ├── CampaignForm.tsx
│       └── ROIBreakdown.tsx
│
└── agent/                    # Local daemon
    └── src/
        ├── index.js          # Poll loop
        ├── api.js            # HTTP client for backend
        └── seo/reddit/twitter/newsletter.js
```

## Database Schema

```sql
-- 6 tables total
-- Executors, Users, Products, Campaigns, AgentExecutions, EventTracking
-- Users now supports Google OAuth: google_id, name, avatar_url columns
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google` | No | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | No | Handle OAuth callback, return JWT |
| GET | `/api/auth/me` | No | Get current user (null if no token) |
| POST | `/api/campaigns` | Yes | Create campaign |
| GET | `/api/campaigns` | Yes | List user's campaigns |
| GET | `/api/campaigns/:id` | Yes | Get campaign + executions |
| POST | `/api/campaigns/:id/start` | Yes | Launch campaign |
| GET | `/api/campaigns/:id/results` | Yes | ROI + attribution |
| GET | `/api/executions/pending` | No | Agent daemon poll |
| POST | `/api/executions/:id/complete` | No | Agent daemon submit |
| POST | `/api/track/event` | No | Record event |
| GET | `/api/health` | No | Health check |
