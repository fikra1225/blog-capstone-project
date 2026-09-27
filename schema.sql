-- Run this file once against your PostgreSQL database to set up the schema.
-- Example: psql -d your_db_name -f schema.sql

CREATE TABLE IF NOT EXISTS posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  author     TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default posts (only inserted if the table is empty)
INSERT INTO posts (title, author, content, created_at)
SELECT
  'A slower way to start the day',
  'Alex Morgan',
  'The best ideas rarely arrive on demand. I have started leaving the first hour of my morning open for reading, walking, and noticing what feels interesting before the day gets noisy.',
  '2026-01-18 09:00:00+00'
WHERE NOT EXISTS (SELECT 1 FROM posts);

INSERT INTO posts (title, author, content, created_at)
SELECT
  'Notes from a curious week',
  'Alex Morgan',
  'This week I learned that small experiments are easier to finish than ambitious plans. A little progress, written down, becomes a trail you can follow.',
  '2026-01-12 09:00:00+00'
WHERE NOT EXISTS (SELECT 1 FROM posts LIMIT 1 OFFSET 1);
