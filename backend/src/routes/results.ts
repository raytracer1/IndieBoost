import { Hono } from 'hono';

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser | null } }>();

// GET /api/campaigns/:id/results — Aggregated campaign results + ROI
app.get('/:id/results', async (c) => {
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
    .first<{
      id: number; budget: number; goal: string; status: string;
      product_url: string; product_name: string; created_at: string;
      user_id: number;
    }>();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.user_id !== user.id) return c.json({ error: 'Not authorized' }, 403);

  // Get all executions with executor info
  const executions = await db
    .prepare(`
      SELECT ae.*, e.name as executor_name, e.category as executor_category
      FROM agent_executions ae
      JOIN executors e ON ae.executor_id = e.id
      WHERE ae.campaign_id = ?
      ORDER BY ae.id
    `)
    .bind(id)
    .all<{
      id: number; executor_id: number; executor_name: string; executor_category: string;
      status: string; cost: number; visits: number; signups: number;
      conversions: number; notes: string | null;
    }>();

  // Compute totals
  const totals = executions.results.reduce(
    (acc, ex) => ({
      visits: acc.visits + (ex.visits || 0),
      signups: acc.signups + (ex.signups || 0),
      conversions: acc.conversions + (ex.conversions || 0),
      total_cost: acc.total_cost + (ex.cost || 0),
    }),
    { visits: 0, signups: 0, conversions: 0, total_cost: 0 }
  );

  // ROI calculations
  const costPerSignup = totals.signups > 0 ? totals.total_cost / totals.signups : 0;
  const costPerVisit = totals.visits > 0 ? totals.total_cost / totals.visits : 0;

  // Attribution by executor category
  const attribution: Record<string, { visits: number; signups: number; cost: number }> = {};
  for (const ex of executions.results) {
    const cat = ex.executor_category;
    if (!attribution[cat]) attribution[cat] = { visits: 0, signups: 0, cost: 0 };
    attribution[cat].visits += ex.visits || 0;
    attribution[cat].signups += ex.signups || 0;
    attribution[cat].cost += ex.cost || 0;
  }

  return c.json({
    campaign_id: campaign.id,
    budget: campaign.budget,
    goal: campaign.goal,
    status: campaign.status,
    product_url: campaign.product_url,
    product_name: campaign.product_name,
    totals,
    roi: {
      cost_per_signup: Math.round(costPerSignup * 100) / 100,
      cost_per_visit: Math.round(costPerVisit * 100) / 100,
    },
    agents: executions.results.map((ex) => ({
      executor_id: ex.executor_id,
      executor_name: ex.executor_name,
      category: ex.executor_category,
      status: ex.status,
      cost: ex.cost,
      visits: ex.visits,
      signups: ex.signups,
      conversions: ex.conversions,
      notes: ex.notes,
    })),
    attribution,
  });
});

export { app as results };
