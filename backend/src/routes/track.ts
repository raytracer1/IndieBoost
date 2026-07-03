import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// POST /api/track/event — Record a tracking event
app.post('/track/event', async (c) => {
  const db = c.env.DB;
  const { campaign_id, executor_id, event_type, source } = await c.req.json();

  if (!campaign_id || !event_type || !source) {
    return c.json({ error: 'campaign_id, event_type, and source are required' }, 400);
  }

  if (!['visit', 'signup', 'conversion'].includes(event_type)) {
    return c.json({ error: 'event_type must be visit, signup, or conversion' }, 400);
  }

  const result = await db
    .prepare(
      'INSERT INTO event_tracking (campaign_id, executor_id, event_type, source) VALUES (?, ?, ?, ?)'
    )
    .bind(campaign_id, executor_id || null, event_type, source)
    .run();

  return c.json({ id: result.meta.last_row_id, event_type, source }, 201);
});

export { app as track };
