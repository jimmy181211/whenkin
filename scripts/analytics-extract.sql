-- Read-only statistics computed inside PostgreSQL. Titles are used only for
-- event-topic labels. No names, individual ranges, usable event/response IDs or
-- exact creation timestamps are exported. Personal time data stays in SQL.
WITH topics AS (
  SELECT e.*,array_remove(ARRAY[
    CASE WHEN title ~* '(大学|高校|校园|学生|college|university|campus|student|UCSD|CSSA)' THEN 'college-student-related' END,
    CASE WHEN title ~* '(会议|开会|例会|meeting|sync|standup)' THEN 'meeting' END,
    CASE WHEN title ~* '(学习|复习|自习|study|exam|作业|homework|课程)' THEN 'study' END,
    CASE WHEN title ~* '(聚餐|吃饭|晚餐|午餐|dinner|lunch|food|meal|party|聚会|团建)' THEN 'social' END,
    CASE WHEN title ~* '(运动|球|健身|sport|soccer|basketball|tennis|hiking)' THEN 'sports' END,
    CASE WHEN title ~* '(面试|招聘|求职|interview|career|recruit)' THEN 'career' END
  ],NULL) AS topic_tags FROM events e
), counts AS (
  SELECT e.id,count(r.id)::integer AS response_count,count(DISTINCT r.timezone)::integer AS response_timezone_count,
    count(r.id) FILTER (WHERE r.revision>1)::integer AS revised_responses,
    count(r.id) FILTER (WHERE NOT EXISTS(SELECT 1 FROM availability a WHERE a.response_id=r.id))::integer AS empty_responses
  FROM events e LEFT JOIN responses r ON r.event_id=e.id GROUP BY e.id
), points AS (
  SELECT event_id,starts_at AS at FROM event_windows UNION SELECT event_id,ends_at FROM event_windows
  UNION SELECT r.event_id,a.starts_at FROM availability a JOIN responses r ON r.id=a.response_id
  UNION SELECT r.event_id,a.ends_at FROM availability a JOIN responses r ON r.id=a.response_id
), segments AS (
  SELECT event_id,at AS start,lead(at) OVER(PARTITION BY event_id ORDER BY at) AS finish FROM points
), common_segments AS (
  SELECT s.* FROM segments s JOIN counts c ON c.id=s.event_id
  WHERE finish>start AND c.response_count>0
    AND EXISTS(SELECT 1 FROM event_windows w WHERE w.event_id=s.event_id AND w.starts_at<=s.start AND w.ends_at>=s.finish)
    AND NOT EXISTS(SELECT 1 FROM responses r WHERE r.event_id=s.event_id AND NOT EXISTS(SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.finish))
), starts AS (
  SELECT *,CASE WHEN lag(finish) OVER(PARTITION BY event_id ORDER BY start)=start THEN 0 ELSE 1 END AS new_period FROM common_segments
), grouped AS (
  SELECT *,sum(new_period) OVER(PARTITION BY event_id ORDER BY start) AS period FROM starts
), periods AS (
  SELECT event_id,period,min(start) AS start,max(finish) AS finish FROM grouped GROUP BY event_id,period
), common_stats AS (
  SELECT event_id,count(*)::integer AS shared_period_count,sum(extract(epoch FROM finish-start)/60)::float8 AS shared_minutes,max(extract(epoch FROM finish-start)/60)::float8 AS longest_shared_minutes FROM periods GROUP BY event_id
), offered_stats AS (
  SELECT s.event_id,sum(extract(epoch FROM s.finish-s.start)/60)::float8 AS offered_minutes FROM segments s
  WHERE s.finish>s.start AND EXISTS(SELECT 1 FROM event_windows w WHERE w.event_id=s.event_id AND w.starts_at<=s.start AND w.ends_at>=s.finish) GROUP BY s.event_id
), window_stats AS (
  SELECT w.event_id,count(*)::integer AS window_count,max(o.offered_minutes) AS offered_minutes,min(w.starts_at) AS first_window FROM event_windows w JOIN offered_stats o ON o.event_id=w.event_id GROUP BY w.event_id
), known_zones AS (SELECT DISTINCT name FROM pg_timezone_names), metrics AS (
  SELECT 'E'||lpad(row_number() OVER(ORDER BY e.created_at,e.id)::text,4,'0') AS event_code,
    (e.created_at AT TIME ZONE 'UTC')::date::text AS creation_date_utc,
    CASE WHEN z.name IS NOT NULL THEN extract(isodow FROM e.created_at AT TIME ZONE e.timezone)::integer END AS creation_weekday_local,
    CASE WHEN z.name IS NOT NULL THEN extract(hour FROM e.created_at AT TIME ZONE e.timezone)::integer END AS creation_hour_local,
    e.title AS event_title,e.topic_tags,e.schedule_mode,c.response_count,c.response_timezone_count,c.revised_responses,c.empty_responses,
    nullif(btrim(e.organizer_name),'') IS NOT NULL AS organizer_label_present,
    coalesce(w.window_count,0) AS window_count,w.offered_minutes,
    CASE WHEN e.schedule_mode='dates' AND z.name IS NOT NULL THEN (SELECT count(DISTINCT (w2.starts_at AT TIME ZONE e.timezone)::date)::integer FROM event_windows w2 WHERE w2.event_id=e.id) END AS offered_date_count,
    CASE WHEN e.schedule_mode='dates' THEN extract(epoch FROM w.first_window-e.created_at)/86400 END::float8 AS lead_days,
    coalesce(cs.shared_period_count,0) AS shared_period_count,
    CASE WHEN c.response_count>0 THEN coalesce(cs.shared_minutes,0) END AS shared_minutes,
    CASE WHEN c.response_count>0 THEN coalesce(cs.longest_shared_minutes,0) END AS longest_shared_minutes,
    CASE WHEN c.response_count>0 AND w.offered_minutes>0 THEN 100*coalesce(cs.shared_minutes,0)/w.offered_minutes END AS shared_coverage_percent,
    NULL::float8 AS first_response_hours,NULL::text AS creator_identity,NULL::text AS actual_location,
    z.name IS NULL AS invalid_timezone
  FROM topics e JOIN counts c ON c.id=e.id LEFT JOIN window_stats w ON w.event_id=e.id LEFT JOIN common_stats cs ON cs.event_id=e.id LEFT JOIN known_zones z ON z.name=e.timezone
), common_quarters AS (
  SELECT e.id AS event_id,e.topic_tags,e.schedule_mode,CASE WHEN e.schedule_mode='weekdays' THEN q.at AT TIME ZONE 'UTC' ELSE q.at AT TIME ZONE e.timezone END AS local_time,
    extract(epoch FROM least(q.at+interval '15 minutes',p.finish)-q.at)/60 AS minutes
  FROM periods p JOIN topics e ON e.id=p.event_id JOIN known_zones z ON z.name=e.timezone
  CROSS JOIN LATERAL generate_series(p.start,p.finish-interval '1 microsecond',interval '15 minutes') q(at)
), shared_histogram AS (
  SELECT tag.name AS topic,schedule_mode,extract(isodow FROM local_time)::integer AS weekday,extract(hour FROM local_time)::integer AS hour,sum(minutes)::float8 AS minutes,count(DISTINCT event_id)::integer AS events
  FROM common_quarters CROSS JOIN LATERAL unnest(ARRAY['all']||CASE WHEN cardinality(topic_tags)=0 THEN ARRAY['unclassified'] ELSE topic_tags END) tag(name) GROUP BY 1,2,3,4
), offered_segments AS (
  SELECT s.* FROM segments s WHERE s.finish>s.start AND EXISTS(SELECT 1 FROM event_windows w WHERE w.event_id=s.event_id AND w.starts_at<=s.start AND w.ends_at>=s.finish)
), response_quarters AS (
  SELECT e.id AS event_id,r.id AS response_id,e.topic_tags,e.schedule_mode,frame.name AS time_frame,
    CASE WHEN e.schedule_mode='weekdays' THEN (q.at AT TIME ZONE 'UTC')+CASE WHEN frame.name='responder_local' THEN (e.created_at AT TIME ZONE r.timezone)-(e.created_at AT TIME ZONE e.timezone) ELSE interval '0' END
      WHEN frame.name='responder_local' THEN q.at AT TIME ZONE r.timezone ELSE q.at AT TIME ZONE e.timezone END AS local_time,
    extract(epoch FROM least(q.at+interval '15 minutes',s.finish)-q.at)/60 AS minutes,
    EXISTS(SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.finish) AS free
  FROM offered_segments s JOIN topics e ON e.id=s.event_id JOIN responses r ON r.event_id=e.id
  JOIN known_zones ez ON ez.name=e.timezone JOIN known_zones rz ON rz.name=r.timezone
  CROSS JOIN LATERAL generate_series(s.start,s.finish-interval '1 microsecond',interval '15 minutes') q(at)
  CROSS JOIN (VALUES('responder_local'),('event_local')) frame(name)
), availability_histogram AS (
  SELECT tag.name AS topic,schedule_mode,time_frame,extract(isodow FROM local_time)::integer AS weekday,extract(hour FROM local_time)::integer AS hour,
    coalesce(sum(minutes) FILTER(WHERE free),0)::float8 AS available_minutes,sum(minutes)::float8 AS offered_minutes,
    count(DISTINCT event_id)::integer AS events,count(DISTINCT response_id)::integer AS responses
  FROM response_quarters CROSS JOIN LATERAL unnest(ARRAY['all']||CASE WHEN cardinality(topic_tags)=0 THEN ARRAY['unclassified'] ELSE topic_tags END) tag(name)
  GROUP BY 1,2,3,4,5
)
SELECT jsonb_build_object('extracted_at',statement_timestamp(),'source','whenkin / production / read-only anonymized statistics',
  'events',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY event_code) FROM metrics m),'[]'::jsonb),
  'event_timezones',(SELECT jsonb_agg(to_jsonb(z)) FROM (SELECT timezone,count(*)::integer AS count FROM events GROUP BY timezone ORDER BY count(*) DESC,timezone) z),
  'response_timezones',(SELECT jsonb_agg(to_jsonb(z)) FROM (SELECT timezone,count(*)::integer AS count FROM responses GROUP BY timezone ORDER BY count(*) DESC,timezone) z),
  'shared_time_histogram',(SELECT jsonb_agg(to_jsonb(h) ORDER BY schedule_mode,weekday,hour) FROM shared_histogram h),
  'availability_histogram',(SELECT jsonb_agg(to_jsonb(h) ORDER BY topic,schedule_mode,time_frame,weekday,hour) FROM availability_histogram h),
  'source_counts',jsonb_build_object('events',(SELECT count(*) FROM events),'responses',(SELECT count(*) FROM responses),'event_windows',(SELECT count(*) FROM event_windows),'availability',(SELECT count(*) FROM availability))) AS snapshot;
