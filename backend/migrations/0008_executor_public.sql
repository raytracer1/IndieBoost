-- 0008_executor_public.sql
-- Allow custom executors to be shared across users

ALTER TABLE executors ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
