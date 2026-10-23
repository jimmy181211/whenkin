-- Existing events stay date-based. Weekday polls use a fixed, date-free week
-- coordinate system for their ranges and one shared named time zone for people.
ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'dates'
  CHECK (schedule_mode IN ('dates', 'weekdays'));
