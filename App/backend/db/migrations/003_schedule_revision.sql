ALTER TABLE events
  ADD COLUMN IF NOT EXISTS schedule_revision integer NOT NULL DEFAULT 1 CHECK (schedule_revision > 0),
  ADD COLUMN IF NOT EXISTS write_revision bigint NOT NULL DEFAULT 1 CHECK (write_revision > 0);
