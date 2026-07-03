import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// POST /api/campaigns — Create a campaign
app.post('/', async (c) => {
  const db = c.env.DB;
  const { url, name, goal, budget } = await c.req.json();

  // Validate
  if (!url) return c.json({ error: 'Product URL is required' }, 400);
  if (!goal || !['signups', 'visits', 'waitlist'].includes(goal)) {
    return c.json({ error: 'Goal must be signups, visits, or waitlist' }, 400);
  }
  if (!budget || budget < 5 || budget > 100) {
    return c.json({ error: 'Budget must be between $5 and $100' }, 400);
  }

  // Ensure demo user exists
  let user = await db.prepare('SELECT id FROM users LIMIT 1').first<{ id: number }>();
  if (!user) {
    const userResult = await db.prepare("INSERT INTO users (email) VALUES ('demo@indieboost.io')").run();
    user = { id: userResult.meta.last_row_id as number };
  }

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

// GET /api/campaigns — List all campaigns
app.get('/', async (c) => {
  const db = c.env.DB;
  const campaigns = await db
    .prepare(`
      SELECT c.*, p.url as product_url, p.name as product_name
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      ORDER BY c.created_at DESC
    `)
    .all();
  return c.json(campaigns.results);
});

// GET /api/campaigns/:id — Get single campaign with executions
app.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const campaign = await db
    .prepare(`
      SELECT c.*, p.url as product_url, p.name as product_name
      FROM campaigns c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ?
    `)
    .bind(id)
    .first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

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

  return c.json({ ...campaign, executions: executions.results });
});

// POST /api/campaigns/:id/start — Launch campaign
app.post('/:id/start', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const campaign = await db
    .prepare('SELECT * FROM campaigns WHERE id = ?')
    .bind(id)
    .first<{ id: number; status: string; budget: number }>();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'draft') {
    return c.json({ error: 'Campaign can only be started from draft status' }, 400);
  }

  // Set campaign to running
  await db
    .prepare("UPDATE campaigns SET status = 'running' WHERE id = ?")
    .bind(id)
    .run();

  // Select active AI executors (2-4 based on budget)
  const activeExecutors = await db
    .prepare("SELECT * FROM executors WHERE type = 'ai' AND is_active = 1")
    .all<{ id: number; name: string; category: string }>();

  const executorCount = campaign.budget < 20 ? 2 : campaign.budget < 50 ? 3 : 4;
  const selected = activeExecutors.results.slice(0, executorCount);

  // Split budget equally among selected executors
  const budgetPerExecutor = campaign.budget / selected.length;

  // Create agent_execution rows
  const stmt = db.prepare(
    'INSERT INTO agent_executions (campaign_id, executor_id, status, cost) VALUES (?, ?, ?, ?)'
  );

  const batch = selected.map((executor) =>
    stmt.bind(id, executor.id, 'pending', budgetPerExecutor)
  );

  await db.batch(batch);

  // Return created executions
  const executions = await db
    .prepare(`
      SELECT ae.*, e.name as executor_name, e.category as executor_category
      FROM agent_executions ae
      JOIN executors e ON ae.executor_id = e.id
      WHERE ae.campaign_id = ? AND ae.status = 'pending'
      ORDER BY ae.id
    `)
    .bind(id)
    .all();

  return c.json({
    id: campaign.id,
    status: 'running',
    agents: executions.results,
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
