-- One administrator-controlled policy. Installing this migration does not
-- change existing event deadlines or delete any event data.
CREATE TABLE event_retention_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  months integer NOT NULL CHECK (months BETWEEN 1 AND 1200)
);
INSERT INTO event_retention_config(singleton, months) VALUES (true, 12);
REVOKE ALL ON TABLE event_retention_config FROM PUBLIC;

CREATE FUNCTION get_event_retention_policy()
RETURNS TABLE(value integer, unit text) LANGUAGE sql STABLE AS $$
  SELECT months, 'month'::text FROM public.event_retention_config WHERE singleton;
$$;

CREATE FUNCTION event_retention_deadline(created timestamptz, duration_months integer DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql STABLE AS $$
DECLARE effective_months integer;
BEGIN
  effective_months := COALESCE(duration_months, (SELECT months FROM public.event_retention_config WHERE singleton));
  IF effective_months IS NULL OR effective_months NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'Retention must be a whole number of months from 1 to 1200.' USING ERRCODE = '22023';
  END IF;
  RETURN ((created AT TIME ZONE 'UTC') + make_interval(months => effective_months)) AT TIME ZONE 'UTC';
END;
$$;

CREATE FUNCTION set_event_retention_months(duration_months integer)
RETURNS TABLE(value integer, unit text) LANGUAGE plpgsql AS $$
BEGIN
  IF duration_months IS NULL OR duration_months NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'Retention must be a whole number of months from 1 to 1200.' USING ERRCODE = '22023';
  END IF;
  -- Keep the policy and stored deadlines consistent with concurrent event creation.
  LOCK TABLE public.events IN SHARE ROW EXCLUSIVE MODE;
  UPDATE public.event_retention_config SET months = duration_months WHERE singleton;
  UPDATE public.events SET expires_at = public.event_retention_deadline(created_at, duration_months);
  RETURN QUERY SELECT * FROM public.get_event_retention_policy();
END;
$$;
REVOKE ALL ON FUNCTION set_event_retention_months(integer) FROM PUBLIC;

ALTER TABLE events ALTER COLUMN expires_at SET DEFAULT public.event_retention_deadline(now());

CREATE OR REPLACE FUNCTION purge_expired_events(batch_size integer DEFAULT 100)
RETURNS TABLE(deleted_events integer) LANGUAGE sql AS $$
  WITH expired AS (
    SELECT id FROM public.events
    WHERE public.event_retention_deadline(created_at) <= statement_timestamp()
    ORDER BY created_at LIMIT greatest(1, least(batch_size, 1000))
    FOR UPDATE SKIP LOCKED
  ), removed AS (
    DELETE FROM public.events USING expired WHERE events.id = expired.id RETURNING events.id
  ) SELECT count(*)::integer FROM removed;
$$;
