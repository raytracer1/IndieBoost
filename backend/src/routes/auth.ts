import { Hono } from 'hono';
import { createJWT, verifyJWT } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/password';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// POST /api/auth/register — Email + password registration
app.post('/register', async (c) => {
  const db = c.env.DB;
  const { email, password, name } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  // Check if email already exists
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first();

  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await db
    .prepare("INSERT INTO users (email, password_hash, name, type) VALUES (?, ?, ?, 'email')")
    .bind(email.toLowerCase().trim(), passwordHash, name || email.split('@')[0])
    .run();

  const user = {
    id: result.meta.last_row_id as number,
    email: email.toLowerCase().trim(),
    name: name || email.split('@')[0],
    avatar_url: null,
  };

  const token = await createJWT(user, c.env.JWT_SECRET);

  return c.json({ user, token }, 201);
});

// POST /api/auth/login — Email + password login
app.post('/login', async (c) => {
  const db = c.env.DB;
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Find user
  const user = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first<{ id: number; email: string; password_hash: string | null; name: string | null; avatar_url: string | null }>();

  if (!user || !user.password_hash) {
    return c.json({ error: 'Invalid email or password. If you signed up with Google, please use Google Sign-In.' }, 401);
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await createJWT(
    { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    c.env.JWT_SECRET
  );

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    token,
  });
});

// GET /api/auth/google — Redirect to Google OAuth
app.get('/google', (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return c.redirect(url);
});

// GET /api/auth/google/callback — Handle OAuth callback
app.get('/google/callback', async (c) => {
  const db = c.env.DB;
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: c.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json() as { error_description?: string };
      console.error('Token exchange failed:', JSON.stringify(err));
      return c.json({ error: 'Failed to authenticate with Google' }, 400);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      id_token?: string;
    };

    // Fetch user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return c.json({ error: 'Failed to get user info' }, 400);
    }

    const googleUser = await userRes.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Upsert user
    let user = await db
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleUser.id)
      .first<{ id: number; email: string; name: string | null; avatar_url: string | null }>();

    if (user) {
      // Update existing user
      await db
        .prepare('UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE google_id = ?')
        .bind(googleUser.email, googleUser.name, googleUser.picture, googleUser.id)
        .run();
      user.name = googleUser.name;
      user.avatar_url = googleUser.picture;
    } else {
      // Check if email exists (non-Google user upgrade)
      const emailUser = await db
        .prepare('SELECT * FROM users WHERE email = ? AND google_id IS NULL')
        .bind(googleUser.email)
        .first<{ id: number }>();

      if (emailUser) {
        // Link Google to existing user
        await db
          .prepare('UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE id = ?')
          .bind(googleUser.id, googleUser.name, googleUser.picture, emailUser.id)
          .run();
        user = { id: emailUser.id, email: googleUser.email, name: googleUser.name, avatar_url: googleUser.picture };
      } else {
        // Create new user
        const result = await db
          .prepare(
            "INSERT INTO users (email, google_id, name, avatar_url, type) VALUES (?, ?, ?, ?, 'google')"
          )
          .bind(googleUser.email, googleUser.id, googleUser.name, googleUser.picture)
          .run();

        user = {
          id: result.meta.last_row_id as number,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        };
      }
    }

    // Create JWT
    const token = await createJWT(user, c.env.JWT_SECRET);

    // Redirect to frontend with token
    const frontendUrl = c.env.GOOGLE_REDIRECT_URI?.includes('localhost')
      ? 'http://localhost:3000'
      : c.env.GOOGLE_REDIRECT_URI?.split('/api/')[0] || 'http://localhost:3000';

    return c.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('OAuth error:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// GET /api/auth/me — Get current user
app.get('/me', async (c) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return c.json({ user: null });
  }

  try {
    const { verifyJWT } = await import('../middleware/auth');
    const user = await verifyJWT(token, c.env.JWT_SECRET);
    return c.json({ user });
  } catch {
    return c.json({ user: null });
  }
});

export { app as auth };
