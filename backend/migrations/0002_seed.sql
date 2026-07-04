-- 0002_seed.sql
-- Seed MVP data

INSERT OR IGNORE INTO executors (name, type, category) VALUES
  ('SEO Agent',      'ai', 'seo'),
  ('Reddit Agent',   'ai', 'reddit'),
  ('Twitter Agent',  'ai', 'twitter'),
  ('Newsletter Agent','ai', 'newsletter');

INSERT OR IGNORE INTO users (email) VALUES ('demo@indieboost.io');
