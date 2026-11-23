-- Preserve every existing event's quarter-hour interpretation and stored ranges.
ALTER TABLE events ADD COLUMN slot_minutes integer NOT NULL DEFAULT 15
  CHECK (slot_minutes IN (15, 30));

-- Only future inserts use half-hour slots. Existing timestamps are never rounded.
ALTER TABLE events ALTER COLUMN slot_minutes SET DEFAULT 30;
