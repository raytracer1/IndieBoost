-- 0007_webhook_executor.sql
-- Support user-provided agent webhooks

ALTER TABLE executors ADD COLUMN webhook_url TEXT;
ALTER TABLE executors ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Allow user_id to link executor ownership
CREATE INDEX IF NOT EXISTS idx_executors_user ON executors(user_id);
