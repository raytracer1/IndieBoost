-- 0003_google_oauth.sql
-- Add Google OAuth fields to users table

ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
