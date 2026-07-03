import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { campaigns } from './routes/campaigns';
import { results } from './routes/results';
import { track } from './routes/track';
import { executions } from './routes/executions';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*' }));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Routes
app.route('/api/campaigns', campaigns);
app.route('/api/campaigns', results);
app.route('/api', track);
app.route('/api/executions', executions);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
