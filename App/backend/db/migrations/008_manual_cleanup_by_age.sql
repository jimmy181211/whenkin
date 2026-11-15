-- Manual cleanup follows creation age even if an old stored expiry was changed.
CREATE OR REPLACE FUNCTION purge_expired_events(batch_size integer DEFAULT 100)
RETURNS TABLE(deleted_events integer) LANGUAGE sql AS $$
  WITH expired AS (
    SELECT id FROM events
    WHERE (((created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC') <= statement_timestamp()
    ORDER BY created_at LIMIT greatest(1, least(batch_size, 1000))
    FOR UPDATE SKIP LOCKED
  ), removed AS (
    DELETE FROM events USING expired WHERE events.id = expired.id RETURNING events.id
  ) SELECT count(*)::integer FROM removed;
$$;
