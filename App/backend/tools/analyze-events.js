/** Summarizes a read-only snapshot and writes local analysis artifacts. */
import { renderAnalysisReport } from './analytics-report.js';
import {
  readFile,
  mkdir,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDatabase } from '../db/connection.js';

// Metrics whose null/undefined values are counted in the report's missing-data summary.
const fields = [
  'response_count',
  'offered_date_count',
  'offered_minutes',
  'lead_days',
  'shared_minutes',
  'longest_shared_minutes',
  'shared_coverage_percent',
  'first_response_hours',
  'creator_identity',
  'actual_location',
];

/**
 * Find the middle observation without changing the supplied array.
 * @returns The middle value or middle pair's average, or null when there are no values.
 */
const median = (values) => {
  const v = [...values].sort(
    /* Sort numeric observations before finding their middle value. */
    (a, b) => a - b,
  );
  const n = v.length;
  return n
    ? (v[Math.floor((n - 1) / 2)] + v[Math.ceil((n - 1) / 2)]) / 2
    : null;
};

/**
 * Accept finite numbers while excluding missing values and numeric
 * strings.
 * @returns Whether the observation is a usable finite numeric measurement.
 */
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Summarize an extracted snapshot without querying or changing the database.
 * Keep every event, including missing values and outliers; add flags for review.
 * @returns The snapshot with topic evidence, review flags, and aggregate statistics.
 */
export function analyzeSnapshot(snapshot) {
  if (!Array.isArray(snapshot.events)) {
    throw Error('Missing events array.');
  }
  // Title keywords explain existing topic tags; they do not establish anyone's identity.
  const rules = {
    'college-student-related':
      /(大学|高校|校园|学生|college|university|campus|student|UCSD|CSSA)/i,
    meeting: /(会议|开会|例会|meeting|sync|standup)/i,
    study: /(学习|复习|自习|study|exam|作业|homework|课程)/i,
    social: /(聚餐|吃饭|晚餐|午餐|dinner|lunch|food|meal|party|聚会|团建)/i,
    sports: /(运动|球|健身|sport|soccer|basketball|tennis|hiking)/i,
    career: /(面试|招聘|求职|interview|career|recruit)/i,
  };
  const events = snapshot.events.map(
    /* Copy each event and attach topic evidence and an empty review-flag list. */
    (e) => ({
      ...e,
      topic_tags: e.topic_tags?.length ? e.topic_tags : ['unclassified'],
      topic_evidence: (e.topic_tags || []).map(
        /** Explain a topic tag with the matching title text, or request review. */
        (tag) =>
          tag +
          ': ' +
          (String(e.event_title || '').match(rules[tag])?.[0] ||
            'review required'),
      ),
      review_flags: [],
    }),
  );
  const topic_counts = Object.fromEntries(
    [
      ...new Set(
        events.flatMap(
          /* Collect all topic labels before counting distinct tags. */
          (e) => e.topic_tags,
        ),
      ),
    ].map(
      /* Pair each distinct topic with the number of events carrying it. */
      (tag) => [
        tag,
        events.filter(
          /* Select events that carry this topic tag. */
          (e) => e.topic_tags.includes(tag),
        ).length,
      ],
    ),
  );

  for (const key of [
    'response_count',
    'lead_days',
    'shared_minutes',
  ]) {
    const values = events
      .map(
        /* Read the metric currently being checked for outliers. */
        (e) => e[key],
      )
      .filter(finite)
      .sort(
        /* Order the usable observations before calculating quartiles. */
        (a, b) => a - b,
      );
    if (values.length < 4) {
      continue;
    }
    // Lower and upper quartiles define the typical spread used for outlier flags.
    const q1 = values[Math.floor((values.length - 1) * 0.25)];
    const q3 = values[Math.floor((values.length - 1) * 0.75)];
    // Interquartile range measures spread; values outside 1.5 times it are flagged only.
    const iqr = q3 - q1;
    for (const e of events) {
      if (
        finite(e[key]) &&
        (e[key] < q1 - 1.5 * iqr || e[key] > q3 + 1.5 * iqr)
      ) {
        e.review_flags.push(key + ': outside 1.5×IQR');
      }
    }
  }
  for (const e of events) {
    if (finite(e.lead_days) && e.lead_days < 0) {
      e.review_flags.push('first offered date precedes creation (review only)');
    }
    if (e.invalid_timezone) {
      e.review_flags.push('invalid timezone');
    }
  }
  const withResponses = events.filter(
    /* Select replied-to events for the shared-time success-rate denominator. */
    (e) => e.response_count > 0,
  );
  return {
    ...snapshot,
    events,
    summary: {
      topic_counts,
      events: events.length,
      responses: events.reduce(
        /* Add each event's reply count to the report total. */
        (n, e) => n + e.response_count,
        0,
      ),
      zero_response_events: events.filter(
        /* Count events that have not received a reply. */
        (e) => e.response_count === 0,
      ).length,
      one_response_events: events.filter(
        /* Count events with exactly one saved reply. */
        (e) => e.response_count === 1,
      ).length,
      multiple_response_events: events.filter(
        /* Count events with more than one saved reply. */
        (e) => e.response_count > 1,
      ).length,
      multiple_response_events_with_shared_time: events.filter(
        /** Count multi-person events that have at least one shared minute. */
        (e) => e.response_count > 1 && e.shared_minutes > 0,
      ).length,
      events_with_shared_time: events.filter(
        /** Select events with a measured, positive shared-time duration. */
        (e) => finite(e.shared_minutes) && e.shared_minutes > 0,
      ).length,
      shared_time_rate_among_responded: withResponses.length
        ? events.filter(
          /* Use the same shared-time condition for the success-rate numerator. */
          (e) => finite(e.shared_minutes) && e.shared_minutes > 0,
        ).length / withResponses.length
        : null,
      median_responses: median(
        events.map(
          /* Collect reply counts for the median calculation. */
          (e) => e.response_count,
        ),
      ),
      mean_responses: events.length
        ? events.reduce(
          /* Sum reply counts for the mean calculation. */
          (n, e) => n + e.response_count,
          0,
        ) / events.length
        : null,
      creator_label_present: events.filter(
        /* Count records where an organizer label was supplied. */
        (e) => e.organizer_label_present,
      ).length,
      retained_events: events.length,
      excluded_events: 0,
      review_flagged_events: events.filter(
        /* Count events with at least one review flag, without excluding them. */
        (e) => e.review_flags.length,
      ).length,
      missing: Object.fromEntries(
        fields.map(
          /* Pair each metric with its number of missing observations. */
          (key) => [
            key,
            events.filter(
              /* Treat null and undefined as missing, while retaining zero values. */
              (e) => e[key] === null || e[key] === undefined,
            ).length,
          ],
        ),
      ),
    },
  };
}

/**
 * Check snapshot counts, then write JSON, CSV, and an HTML report to a local folder.
 * @param output - Destination directory; this function does not publish the report.
 * @returns Aggregate statistics; summary.json contains the full analyzed snapshot.
 */
export async function writeAnalysis(snapshot, output) {
  const result = analyzeSnapshot(snapshot);
  if (
    snapshot.source_counts &&
    (Number(snapshot.source_counts.events) !== result.summary.events ||
      Number(snapshot.source_counts.responses) !== result.summary.responses)
  ) {
    throw Error('Snapshot row counts do not reconcile.');
  }
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, 'summary.json'),
    JSON.stringify(result, null, 2),
  );
  const columns = [
    'event_code',
    'event_title',
    'topic_tags',
    'topic_evidence',
    'creation_date_utc',
    'creation_weekday_local',
    'creation_hour_local',
    'schedule_mode',
    'response_count',
    'response_timezone_count',
    'offered_date_count',
    'offered_minutes',
    'lead_days',
    'shared_period_count',
    'shared_minutes',
    'longest_shared_minutes',
    'shared_coverage_percent',
    'first_response_hours',
    'creator_identity',
    'actual_location',
    'organizer_label_present',
    'revised_responses',
    'empty_responses',
    'review_flags',
  ];

  /**
   * Quote a CSV field, preserving missing values as NULL and joining arrays.
   * @returns One field including its outer double quotes and escaped inner quotes.
   */
  const csvValue = (value) =>
    '"' +
    String(
      value === null || value === undefined
        ? 'NULL'
        : Array.isArray(value)
          ? value.join('; ')
          : value,
    ).replaceAll('"', '""') +
    '"';

  await writeFile(
    resolve(output, 'events.csv'),
    '\ufeff' +
      [
        columns.join(','),
        ...result.events.map(
          /* Render each event in the CSV's chosen column order. */
          (e) =>
            columns
              .map(
                /* Encode one event field for the CSV row. */
                (c) => csvValue(e[c]),
              )
              .join(','),
        ),
      ].join('\r\n'),
  );
  const html = renderAnalysisReport(result, columns);
  await writeFile(resolve(output, 'analysis.html'), html);
  return result.summary;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  let database;
  try {
    const args = process.argv.slice(2);
    const input = args[args.indexOf('--input') + 1];
    const output = resolve(
      args.includes('--output')
        ? args[args.indexOf('--output') + 1]
        : 'outputs/analytics',
    );
    let snapshot;
    if (args.includes('--input')) {
      snapshot = JSON.parse(await readFile(resolve(input), 'utf8'));
    } else {
      database = createDatabase();
      const rows = await database.query(
        await readFile(
          new URL('./analytics-extract.sql', import.meta.url),
          'utf8',
        ),
      );
      snapshot = rows[0].snapshot;
    }
    console.log(JSON.stringify(await writeAnalysis(snapshot, output), null, 2));
  } catch {
    console.error(
      'Analysis failed. Check the input file or database configuration. No credentials were printed.',
    );
    process.exitCode = 1;
  } finally {
    await database?.close();
  }
}
