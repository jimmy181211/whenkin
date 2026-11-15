CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  organizer_name text NOT NULL CHECK (length(organizer_name) BETWEEN 1 AND 60),
  timezone text NOT NULL,
  duration integer NOT NULL CHECK (duration BETWEEN 15 AND 240 AND duration % 15 = 0),
  admin_hash text NOT NULL,
  final_start timestamptz,
  final_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((final_start IS NULL AND final_end IS NULL) OR (final_start IS NOT NULL AND final_end > final_start))
);
CREATE TABLE IF NOT EXISTS event_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS event_windows_event ON event_windows(event_id);
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60), timezone text NOT NULL,
  edit_hash text NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS responses_event ON responses(event_id);
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), response_id uuid NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS availability_response ON availability(response_id);
