# AI Agent Developer Guide

## What is an Agent in IndieBoost?

An **agent** is a simulated AI executor that performs growth/marketing tasks for a campaign. Each agent runs as part of the `agent/` daemon process, which polls the database for pending executions and dispatches them.

Agents are **stateless, independently runnable, and replaceable**. Each agent module exports a single `run()` function.

## Agent Interface

Every agent module must export:

```js
/**
 * @param {Object} context
 * @param {number} context.executionId   — agent_executions.id
 * @param {number} context.campaignId    — campaigns.id
 * @param {number} context.executorId    — executors.id
 * @param {string} context.productUrl    — product URL
 * @param {string} context.productName   — product name
 * @param {number} context.budget        — budget allocated to this agent (dollars)
 * @param {string} context.goal          — 'signups' | 'visits' | 'waitlist'
 * @param {Object} context.db            — better-sqlite3 database instance
 * @returns {Object} { visits: number, signups: number, conversions: number, cost: number, notes: string }
 */
async function run(context) {
  // 1. Simulate work
  // 2. Return metrics
}
```

## How Agents Are Invoked

1. The daemon (`agent/src/index.js`) polls `agent_executions` for rows with `status = 'pending'`.
2. For each pending execution, it looks up the executor via `executor_id` to get the `category`.
3. It routes to the correct agent module based on `category`:
   - `seo` → `agent/src/seo.js`
   - `reddit` → `agent/src/reddit.js`
   - `twitter` → `agent/src/twitter.js`
   - `newsletter` → `agent/src/newsletter.js`
4. The agent's `run()` function is called with the campaign context.
5. The daemon writes the returned metrics to `agent_executions` and generates `event_tracking` rows.

## What Agents Write to the Database

After `run()` returns, the daemon writes:

### 1. UPDATE agent_executions
```sql
UPDATE agent_executions SET
  status = 'completed',
  visits = <returned>,
  signups = <returned>,
  conversions = <returned>,
  cost = <returned>,
  notes = <returned>,
  completed_at = datetime('now')
WHERE id = ?;
```

### 2. INSERT event_tracking rows
For each simulated event type, the daemon inserts tracking rows:
```sql
INSERT INTO event_tracking (campaign_id, executor_id, event_type, source)
VALUES (?, ?, 'visit', '<category>'),      -- multiple rows
       (?, ?, 'signup', '<category>'),     -- multiple rows
       (?, ?, 'conversion', '<category>'); -- multiple rows
```

### 3. UPDATE campaign (if all executions done)
```sql
UPDATE campaigns SET status = 'completed' WHERE id = ?;
```

## Simulation Guidelines

### Budget-to-Metrics Formula

Each agent receives a portion of the total campaign budget. Use these formulas as a baseline:

```
visits = budget * BASE_RATE * random(0.7, 1.3)
signups = visits * CONVERSION_RATE * random(0.7, 1.3)
conversions = signups * CONVERSION_RATE_2 * random(0.7, 1.3)
cost = budget
```

### Per-Agent Parameters

| Agent | visits/$ | signup rate | conversion rate | Notes |
|-------|----------|-------------|-----------------|-------|
| SEO | 30–50 | 3–5% | 10–20% | High volume, low conversion |
| Reddit | 20–35 | 6–10% | 15–25% | Medium volume, medium conversion |
| Twitter | 15–30 | 5–8% | 15–25% | Lower volume, engaged audience |
| Newsletter | 8–15 | 8–15% | 20–40% | Low volume, highest conversion |

### Deterministic Simulation

Use a seeded pseudo-random approach based on `campaignId + executorId` so results are consistent if the same campaign is re-run:

```js
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
```

### Notes Generation

Each agent should produce a human-readable `notes` string describing what was simulated:
- SEO: "Generated N blog posts targeting M keywords. Estimated X monthly organic visits."
- Reddit: "Posted in r/subreddit1, r/subreddit2. N upvotes, M comments. Y referral clicks."
- Twitter: "Published N tweets, M threads. X total impressions, Y clicks."
- Newsletter: "Sent to N subscribers. M% open rate. Y clicks, Z conversions."

## Adding a New Agent Type

1. **Register the executor** — INSERT a row into the `executors` table:
   ```sql
   INSERT INTO executors (name, type, category) VALUES ('YouTube Agent', 'ai', 'youtube');
   ```

2. **Create the agent module** — `agent/src/youtube.js`:
   ```js
   async function run({ executionId, campaignId, executorId, productUrl, productName, budget, goal, db }) {
     const visits = Math.round(budget * 10 * (0.7 + Math.random() * 0.6));
     const signups = Math.round(visits * 0.05 * (0.7 + Math.random() * 0.6));
     const conversions = Math.round(signups * 0.2 * (0.7 + Math.random() * 0.6));
     return {
       visits,
       signups,
       conversions,
       cost: budget,
       notes: `YouTube campaign: generated ${visits} views across 3 videos. ${signups} signups.`
     };
   }
   module.exports = { run };
   ```

3. **Register in the router** — `agent/src/index.js`:
   ```js
   const agents = {
     seo: require('./seo'),
     reddit: require('./reddit'),
     twitter: require('./twitter'),
     newsletter: require('./newsletter'),
     youtube: require('./youtube'),  // ← add here
   };
   ```

No changes needed in backend schema or frontend — the executor system handles it dynamically.

## Supporting Human Creators (Future)

When human creators are added, the flow is:

1. INSERT a row into `executors` with `type = 'human'`:
   ```sql
   INSERT INTO executors (name, type, category) VALUES ('John (Influencer)', 'human', 'twitter');
   ```

2. The agent daemon skips `type = 'human'` executions (their status stays `pending` until a human completes the task via a future creator dashboard).

3. Human creators update their own `agent_executions` rows through a separate interface (TBD).

The `executors` table makes this possible without any schema changes.

## Agent Daemon Lifecycle

```
START
  │
  ├── Connect to SQLite (same DB file as backend)
  │
  └── LOOP:
        ├── SELECT * FROM agent_executions
        │   WHERE status = 'pending'
        │   AND executor_id IN (SELECT id FROM executors WHERE type = 'ai')
        │
        ├── For each pending execution:
        │   ├── Look up executor.category
        │   ├── UPDATE status = 'running', started_at = now
        │   ├── Look up campaign + product info
        │   ├── Call agent[category].run({...})
        │   ├── UPDATE agent_executions with results
        │   ├── INSERT event_tracking rows
        │   └── Check if campaign is fully done → UPDATE campaign
        │
        └── Sleep 3 seconds → back to LOOP
```

## Error Handling

If `run()` throws:
- Set `agent_executions.status = 'failed'`
- Set `agent_executions.notes = error.message`
- Do NOT block other pending executions
- Log to stderr for debugging

## Environment

- **Runtime**: Node.js (v22+)
- **Database**: better-sqlite3 (synchronous)
- **DB file path**: `agent/data/indieboost.db` — symlink or same path as `backend/data/indieboost.db`
- **Poll interval**: 3 seconds
- **No external API calls**: All results are simulated locally
