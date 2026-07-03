-- 0009_unify_executors.sql
-- Mark built-in executors as public (admin user linking done in app init via ADMIN_EMAIL env var)
UPDATE executors SET is_public = 1 WHERE webhook_url IS NULL;
