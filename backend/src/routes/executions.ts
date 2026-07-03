import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// GET /api/executions/pending — Agent daemon polls this for work
app.get('/pending', async (c) => {
  const db = c.env.DB;

  const executions = await db
    .prepare(`
      SELECT
        ae.id,
        ae.campaign_id,
        ae.executor_id,
        ae.cost as budget,
        e.name as executor_name,
        e.category as executor_category,
        c.goal,
        c.id as campaign_id,
        p.url as product_url,
        p.name as product_name
      FROM agent_executions ae
      JOIN executors e ON ae.executor_id = e.id
      JOIN campaigns c ON ae.campaign_id = c.id
      JOIN products p ON c.product_id = p.id
      WHERE ae.status = 'pending'
        AND e.type = 'ai'
        AND e.webhook_url IS NULL
      ORDER BY ae.id
      LIMIT 10
    `)
    .all();

  return c.json(executions.results);
});

// POST /api/executions/:id/complete — Agent daemon submits results
app.post('/:id/complete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { visits, signups, conversions, cost, notes } = await c.req.json();

  // Validate execution exists and is running
  const execution = await db
    .prepare('SELECT * FROM agent_executions WHERE id = ?')
    .bind(id)
    .first<{ id: number; status: string; campaign_id: number; executor_id: number }>();

  if (!execution) return c.json({ error: 'Execution not found' }, 404);
  if (execution.status !== 'running' && execution.status !== 'pending') {
    return c.json({ error: 'Execution is not in a runnable state' }, 400);
  }

  // Update with a transaction-like batch
  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE agent_executions SET
      status = 'completed',
      visits = ?, signups = ?, conversions = ?, cost = ?,
      notes = ?, completed_at = ?
    WHERE id = ?
  `).bind(visits || 0, signups || 0, conversions || 0, cost || 0, notes || '', now, id);

  // Insert event_tracking rows for attribution
  const executorInfo = await db
    .prepare('SELECT category FROM executors WHERE id = ?')
    .bind(execution.executor_id)
    .first<{ category: string }>();

  const source = executorInfo?.category || 'unknown';
  const eventStmt = db.prepare(
    'INSERT INTO event_tracking (campaign_id, executor_id, event_type, source) VALUES (?, ?, ?, ?)'
  );

  const batch = [updateStmt];

  // Generate individual tracking events
  for (let i = 0; i < (visits || 0); i++) {
    if (i < 20) { // Cap to avoid huge batches; representative sample
      batch.push(eventStmt.bind(execution.campaign_id, execution.executor_id, 'visit', source));
    }
  }
  for (let i = 0; i < (signups || 0); i++) {
    if (i < 20) {
      batch.push(eventStmt.bind(execution.campaign_id, execution.executor_id, 'signup', source));
    }
  }
  for (let i = 0; i < (conversions || 0); i++) {
    if (i < 20) {
      batch.push(eventStmt.bind(execution.campaign_id, execution.executor_id, 'conversion', source));
    }
  }

  await db.batch(batch);

  // Check if all executions for this campaign are done
  const pendingCount = await db
    .prepare("SELECT COUNT(*) as cnt FROM agent_executions WHERE campaign_id = ? AND status IN ('pending','running')")
    .bind(execution.campaign_id)
    .first<{ cnt: number }>();

  if (pendingCount && pendingCount.cnt === 0) {
    await db
      .prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?")
      .bind(execution.campaign_id)
      .run();
  }

  return c.json({ id: Number(id), status: 'completed' });
});

export { app as executions };
