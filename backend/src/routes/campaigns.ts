import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser | null } }>();

// POST /api/campaigns — Create a campaign
app.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { url, name, goal, budget } = await c.req.json();

  // Validate
  if (!url) return c.json({ error: 'Product URL is required' }, 400);
  if (!goal || !['signups', 'visits', 'waitlist'].includes(goal)) {
    return c.json({ error: 'Goal must be signups, visits, or waitlist' }, 400);
  }
  if (!budget || budget < 5 || budget > 100) {
    return c.json({ error: 'Budget must be between $5 and $100' }, 400);
  }
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  // Extract product name from URL if not provided
  const productName = name || extractDomain(url);

  // Create product
  const productResult = await db
    .prepare('INSERT INTO products (user_id, url, name) VALUES (?, ?, ?)')
    .bind(user.id, url, productName)
    .run();

  // Create campaign
  const campaignResult = await db
    .prepare('INSERT INTO campaigns (product_id, budget, goal, status) VALUES (?, ?, ?, ?)')
    .bind(productResult.meta.last_row_id, budget, goal, 'draft')
    .run();

  const campaign = await db
    .prepare(`
      SELECT c.*, p.url as product_url, p.name as product_name
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ?
    `)
    .bind(campaignResult.meta.last_row_id)
    .first();

  return c.json(campaign, 201);
});

// GET /api/campaigns — List current user's campaigns
app.get('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const campaigns = await db
    .prepare(`
      SELECT c.*, p.url as product_url, p.name as product_name
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      WHERE p.user_id = ?
      ORDER BY c.created_at DESC
    `)
    .bind(user.id)
    .all();

  return c.json(campaigns.results);
});

// GET /api/campaigns/:id — Get single campaign with executions (ownership checked)
app.get('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const id = c.req.param('id');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const campaign = await db
    .prepare(`
      SELECT c.*, p.url as product_url, p.name as product_name, p.user_id
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ?
    `)
    .bind(id)
    .first<{ id: number; user_id: number; [key: string]: unknown }>();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.user_id !== user.id) return c.json({ error: 'Not authorized' }, 403);

  const executions = await db
    .prepare(`
      SELECT ae.*, e.name as executor_name, e.type as executor_type, e.category as executor_category
      FROM agent_executions ae
      JOIN executors e ON ae.executor_id = e.id
      WHERE ae.campaign_id = ?
      ORDER BY ae.id
    `)
    .bind(id)
    .all();

  const { user_id, ...campaignData } = campaign;
  return c.json({ ...campaignData, executions: executions.results });
});

// POST /api/campaigns/:id/start — Launch campaign (ownership checked)
app.post('/:id/start', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const id = c.req.param('id');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const campaign = await db
    .prepare(`
      SELECT c.*, p.user_id
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ?
    `)
    .bind(id)
    .first<{ id: number; status: string; budget: number; user_id: number }>();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.user_id !== user.id) return c.json({ error: 'Not authorized' }, 403);
  if (campaign.status !== 'draft') {
    return c.json({ error: 'Campaign can only be started from draft status' }, 400);
  }

  // Set campaign to running
  await db
    .prepare("UPDATE campaigns SET status = 'running' WHERE id = ?")
    .bind(id)
    .run();

  // User must provide executor_ids — manual selection only
  const { executor_ids } = await c.req.json().catch(() => ({}));

  if (!executor_ids || !Array.isArray(executor_ids) || executor_ids.length === 0) {
    return c.json({ error: 'executor_ids is required (array of executor IDs to use)' }, 400);
  }

  // Fetch selected executors — any active executor visible to this user
  const placeholders = executor_ids.map(() => '?').join(',');
  const selected = await db
    .prepare(`
      SELECT * FROM executors
      WHERE id IN (${placeholders})
        AND type = 'ai'
        AND is_active = 1
        AND (user_id IS NULL OR user_id = ? OR is_public = 1)
    `)
    .bind(...executor_ids, user.id)
    .all<{ id: number; name: string; category: string; webhook_url: string | null }>();

  if (selected.results.length === 0) {
    return c.json({ error: 'No valid executors selected. Check IDs.' }, 400);
  }

  // Split budget equally among selected executors
  const budgetPerExecutor = campaign.budget / selected.results.length;

  // Create agent_execution rows
  const stmt = db.prepare(
    'INSERT INTO agent_executions (campaign_id, executor_id, status, cost) VALUES (?, ?, ?, ?)'
  );

  const batch = selected.results.map((executor) =>
    stmt.bind(id, executor.id, 'pending', budgetPerExecutor)
  );

  await db.batch(batch);

  // Fetch product info for webhook dispatch
  const product = await db
    .prepare('SELECT url, name FROM products WHERE id = (SELECT product_id FROM campaigns WHERE id = ?)')
    .bind(id)
    .first<{ url: string; name: string }>();

  // Fetch created executions
  const executions = await db
    .prepare(`
      SELECT ae.*, e.name as executor_name, e.category as executor_category, e.webhook_url
      FROM agent_executions ae
      JOIN executors e ON ae.executor_id = e.id
      WHERE ae.campaign_id = ? AND ae.status = 'pending'
      ORDER BY ae.id
    `)
    .bind(id)
    .all<{
      id: number; executor_id: number; executor_name: string;
      executor_category: string; webhook_url: string | null; cost: number;
    }>();

  // Dispatch webhook calls for custom executors (fire-and-forget)
  for (const exec of executions.results) {
    if (exec.webhook_url) {
      const payload = {
        executionId: exec.id,
        campaignId: campaign.id,
        productUrl: product?.url || '',
        productName: product?.name || '',
        budget: exec.cost,
        goal: campaign.goal,
      };

      // Fire and forget — don't block the response
      c.executionCtx.waitUntil(
        fetch(exec.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (res.ok) {
            await db
              .prepare("UPDATE agent_executions SET status = 'running', started_at = datetime('now') WHERE id = ?")
              .bind(exec.id)
              .run();
            console.log(`Webhook dispatched: ${exec.webhook_url} (execution #${exec.id})`);
          } else {
            console.error(`Webhook failed: ${exec.webhook_url} status=${res.status}`);
          }
        }).catch((err) => {
          console.error(`Webhook error: ${exec.webhook_url}`, err.message);
        })
      );
    }
  }

  return c.json({
    id: campaign.id,
    status: 'running',
    agents: executions.results.map((e) => ({
      id: e.id,
      executor_id: e.executor_id,
      executor_name: e.executor_name,
      category: e.executor_category,
      status: 'pending',
      cost: e.cost,
      webhook_url: e.webhook_url,
    })),
  });
});

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export { app as campaigns };
