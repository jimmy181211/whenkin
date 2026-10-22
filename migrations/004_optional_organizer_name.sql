-- Allow organizers to leave their display name blank. Existing names are preserved.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_organizer_name_check;
ALTER TABLE events ADD CONSTRAINT events_organizer_name_check CHECK (length(organizer_name) <= 60);
