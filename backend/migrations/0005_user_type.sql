-- 0005_user_type.sql
-- Add explicit auth type to users

ALTER TABLE users ADD COLUMN type TEXT NOT NULL DEFAULT 'email' CHECK(type IN ('email', 'google'));

-- Update existing users based on their auth method
UPDATE users SET type = 'google' WHERE google_id IS NOT NULL;
UPDATE users SET type = 'email' WHERE password_hash IS NOT NULL OR (google_id IS NULL AND password_hash IS NULL);
