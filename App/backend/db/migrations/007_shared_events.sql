-- Preserve historical columns for older deployments; new code does not use them.
ALTER TABLE events ALTER COLUMN duration SET DEFAULT 15;
ALTER TABLE events ALTER COLUMN admin_hash SET DEFAULT '';
ALTER TABLE events ALTER COLUMN expires_at SET DEFAULT (((now() AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC');
UPDATE events SET expires_at = ((created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC';

-- No participant cap. Keep a database check for response writes after expiry.
ALTER FUNCTION check_response_limit() RENAME TO check_response_expiry;
ALTER TRIGGER responses_limit ON responses RENAME TO responses_expiry;
CREATE OR REPLACE FUNCTION check_response_expiry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM events WHERE id = NEW.event_id FOR UPDATE;
  IF (SELECT expires_at <= clock_timestamp() FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'This event has expired.' USING ERRCODE = 'WK001';
  END IF;
  RETURN NEW;
END;
$$;

-- Called manually. Both checks protect an event younger than a calendar year,
-- even if someone has accidentally changed its stored expiry date.
CREATE OR REPLACE FUNCTION purge_expired_events(batch_size integer DEFAULT 100)
RETURNS TABLE(deleted_events integer) LANGUAGE sql AS $$
  WITH expired AS (
    SELECT id FROM events WHERE expires_at <= statement_timestamp()
      AND (((created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC') <= statement_timestamp()
    ORDER BY expires_at LIMIT greatest(1, least(batch_size, 1000))
    FOR UPDATE SKIP LOCKED
  ), removed AS (
    DELETE FROM events USING expired WHERE events.id = expired.id RETURNING events.id
  ) SELECT count(*)::integer FROM removed;
$$;
REVOKE ALL ON FUNCTION purge_expired_events(integer) FROM PUBLIC;
