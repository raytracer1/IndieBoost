// App initialization — runs on first request
// Ensures admin user and executor linking based on env vars

interface Env {
  DB: D1Database;
  ADMIN_EMAIL: string;
}

let initialized = false;

export async function initApp(db: D1Database, adminEmail: string) {
  if (initialized) return;
  initialized = true;

  if (!adminEmail) {
    console.warn('[init] ADMIN_EMAIL not set, built-in executors will have no owner');
    return;
  }

  // Upsert admin user
  let admin = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(adminEmail)
    .first<{ id: number }>();

  if (!admin) {
    const result = await db
      .prepare("INSERT INTO users (email, type, name, email_verified) VALUES (?, 'email', 'IndieBoost Admin', 1)")
      .bind(adminEmail)
      .run();
    admin = { id: result.meta.last_row_id as number };
    console.log(`[init] Created admin user: ${adminEmail} (id=${admin.id})`);
  }

  // Link built-in executors (those without webhook_url) to admin user
  await db
    .prepare('UPDATE executors SET user_id = ?, is_public = 1 WHERE webhook_url IS NULL AND user_id IS NULL')
    .bind(admin.id)
    .run();

  console.log(`[init] Built-in executors linked to admin (id=${admin.id})`);
}
