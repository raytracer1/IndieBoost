-- 0004_password_auth.sql
-- Add email/password authentication support

ALTER TABLE users ADD COLUMN password_hash TEXT;
