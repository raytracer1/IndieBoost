import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
};

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

// Create JWT
export async function createJWT(user: AuthUser, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  return new jose.SignJWT({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

// Verify JWT
export async function verifyJWT(token: string, secret: string): Promise<AuthUser | null> {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const { payload } = await jose.jwtVerify(token, key);
    return {
      id: Number(payload.sub),
      email: (payload.email as string) || '',
      name: (payload.name as string) || null,
      avatar_url: (payload.avatar_url as string) || null,
    };
  } catch {
    return null;
  }
}

// Optional auth middleware — sets user if token is valid, null otherwise
export const optionalAuth = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    const user = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('user', user);
  } else {
    c.set('user', null);
  }

  await next();
});

// Required auth middleware — returns 401 if no valid token
export const requireAuth = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const user = await verifyJWT(token, c.env.JWT_SECRET);
  if (!user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('user', user);
  await next();
});
