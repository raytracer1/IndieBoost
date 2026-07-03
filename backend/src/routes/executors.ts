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

// POST /api/executors — Create a custom executor (user's own agent webhook)
app.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const { name, category, webhook_url, is_public } = await c.req.json();
  if (!name || !category || !webhook_url) {
    return c.json({ error: 'name, category, and webhook_url are required' }, 400);
  }

  try {
    new URL(webhook_url);
  } catch {
    return c.json({ error: 'Invalid webhook_url' }, 400);
  }

  const result = await db
    .prepare('INSERT INTO executors (name, type, category, webhook_url, user_id, is_public) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(name, 'ai', category, webhook_url, user.id, is_public ? 1 : 0)
    .run();

  return c.json({
    id: result.meta.last_row_id,
    name,
    type: 'ai',
    category,
    webhook_url,
    user_id: user.id,
  }, 201);
});

// GET /api/executors — List user's custom executors + built-in ones
app.get('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  const executors = await db
    .prepare(`
      SELECT * FROM executors
      WHERE user_id = ? OR is_public = 1
      ORDER BY user_id = ? DESC, id
    `)
    .bind(user?.id || 1, user?.id || 1)
    .all();

  return c.json(executors.results);
});

// GET /api/executors/public — Marketplace: list public custom executors
app.get('/public', async (c) => {
  const db = c.env.DB;
  const executors = await db
    .prepare(`
      SELECT e.*, u.email as creator_email, u.name as creator_name
      FROM executors e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_public = 1 AND e.is_active = 1 AND e.webhook_url IS NOT NULL
      ORDER BY e.id DESC
    `)
    .all();
  return c.json(executors.results);
});

// DELETE /api/executors/:id — Delete user's custom executor
app.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const executor = await db
    .prepare('SELECT * FROM executors WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ id: number; user_id: number | null }>();

  if (!executor) return c.json({ error: 'Executor not found' }, 404);
  if (!executor.user_id || executor.user_id !== user.id) {
    return c.json({ error: 'Cannot delete built-in or other user executors' }, 403);
  }

  await db.prepare('DELETE FROM executors WHERE id = ?').bind(executor.id).run();
  return c.json({ success: true });
});

export { app as executors };
