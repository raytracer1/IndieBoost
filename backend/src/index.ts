import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { campaigns } from './routes/campaigns';
import { results } from './routes/results';
import { track } from './routes/track';
import { executions } from './routes/executions';
import { auth } from './routes/auth';
import { requireAuth } from './middleware/auth';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  RESEND_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Public routes (no auth)
app.route('/api/auth', auth);
app.route('/api/executions', executions);
app.route('/api', track);
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Protected routes (require auth)
app.use('/api/campaigns/*', requireAuth);
app.route('/api/campaigns', campaigns);
app.route('/api/campaigns', results);

export default app;
