-- Every link belongs to the event and shares its fixed expiry date.
ALTER TABLE events ADD COLUMN expires_at timestamptz;
UPDATE events SET expires_at = ((created_at AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC';
ALTER TABLE events ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN expires_at SET DEFAULT (((now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC');
CREATE INDEX events_expires_at_idx ON events(expires_at);

-- Lock the parent before counting. Concurrent inserts cannot take the last
-- place together. Count actual responses rather than maintaining a second count.
CREATE FUNCTION check_response_limit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW; -- The foreign key reports a missing event.
  END IF;
  IF (SELECT expires_at <= clock_timestamp() FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'This event has expired.' USING ERRCODE = 'WK001';
  END IF;
  IF TG_OP = 'INSERT' OR NEW.event_id <> OLD.event_id THEN
    IF (SELECT count(*) FROM responses WHERE event_id = NEW.event_id) >= 1000 THEN
      RAISE EXCEPTION 'This event has reached its limit of 1,000 participants.' USING ERRCODE = 'WK002';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER responses_limit BEFORE INSERT OR UPDATE ON responses
  FOR EACH ROW EXECUTE FUNCTION check_response_limit();

-- Only the database owner runs this maintenance operation. Cascading foreign
-- keys remove windows, responses, and availability in the same transaction.
CREATE FUNCTION purge_expired_events(batch_size integer DEFAULT 100)
RETURNS TABLE(deleted_events integer) LANGUAGE sql AS $$
  WITH expired AS (
    SELECT id FROM events WHERE expires_at <= statement_timestamp()
    ORDER BY expires_at LIMIT greatest(1, least(batch_size, 1000))
    FOR UPDATE SKIP LOCKED
  ), removed AS (
    DELETE FROM events USING expired WHERE events.id = expired.id RETURNING events.id
  ) SELECT count(*)::integer FROM removed;
$$;
REVOKE ALL ON FUNCTION purge_expired_events(integer) FROM PUBLIC;
