ALTER TABLE events ADD COLUMN IF NOT EXISTS show_group_availability boolean NOT NULL DEFAULT false;
