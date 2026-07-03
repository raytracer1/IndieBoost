-- 0006_email_otp.sql
-- Add email OTP verification for self-registered users

ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN otp_code TEXT;
ALTER TABLE users ADD COLUMN otp_expires_at TEXT;

-- Demo user and Google users are pre-verified
UPDATE users SET email_verified = 1 WHERE type = 'google';
UPDATE users SET email_verified = 1 WHERE email = 'demo@indieboost.io';
