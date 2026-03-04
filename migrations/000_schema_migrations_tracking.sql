-- Tracking table for applied migrations (checksum for safety).
-- Applied by remote-update.sh: fail hard if a previously applied file has a different checksum.

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
