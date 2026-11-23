import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  allSlots,
  contains,
  gridModel,
  localDate,
  localToUTC,
  SLOT,
  slotsToRanges,
} from '../App/frontend/utils/time';
import { validateRanges } from '../App/backend/shared/validation';

/** Preserve grid boundaries and occurrence indexes while optimizing slot grouping. */
describe('30-minute grid grouping', () => {
  /** No complete slots means no columns or rows. */
  it('returns an empty model for empty or incomplete windows', () => {
    expect(gridModel([], 'UTC')).toEqual({
      days: [],
      rows: [],
    });
    expect(
      gridModel(
        [
          {
            start: '2027-01-15T09:00Z',
            end: '2027-01-15T09:10Z',
          },
        ],
        'UTC',
      ),
    ).toEqual({
      days: [],
      rows: [],
    });
  });

  /** Overlaps are deduplicated; identical clock minutes on separate dates stay ordinary. */
  it('keeps dates sorted and resets occurrence counts for each date', () => {
    const windows = [
      {
        start: '2027-01-16T09:00Z',
        end: '2027-01-16T10:00Z',
      },
      {
        start: '2027-01-15T09:00Z',
        end: '2027-01-15T10:00Z',
      },
      {
        start: '2027-01-15T09:15Z',
        end: '2027-01-15T09:45Z',
      },
    ];
    const before = JSON.stringify(windows);
    const model = gridModel(windows, 'UTC');
    expect(model.days.map(([date]) => date)).toEqual([
      '2027-01-15',
      '2027-01-16',
    ]);
    for (const [, cells] of model.days) {
      expect(cells).toHaveLength(4);
      expect(cells.map((cell) => cell.occurrence)).toEqual([
        0,
        0,
        0,
        0,
      ]);
    }
    expect(model.rows).toHaveLength(2);
    expect(JSON.stringify(windows)).toBe(before);
  });

  /** Blank hours between offered ranges still need display rows. */
  it('retains gap rows and rounds the observed range to whole hours', () => {
    const model = gridModel(
      [
        {
          start: '2027-01-15T12:00Z',
          end: '2027-01-15T12:30Z',
        },
        {
          start: '2027-01-15T09:15Z',
          end: '2027-01-15T09:45Z',
        },
      ],
      'UTC',
    );
    expect(model.rows).toHaveLength(8);
    expect(model.rows[0]).toEqual({
      key: '540:0',
      minute: 540,
      occurrence: 0,
    });
    expect(model.rows.at(-1)?.minute).toBe(750);
    expect(model.days[0][1]).toHaveLength(4);
  });

  /** Lord Howe rolls back thirty minutes; repeated instants must remain distinct. */
  it('preserves partial-hour DST repeats and the existing complete-hour row groups', () => {
    const model = gridModel(
      [
        {
          start: '2026-04-04T14:00Z',
          end: '2026-04-04T16:00Z',
        },
      ],
      'Australia/Lord_Howe',
    );
    const cells = model.days[0][1];
    expect(model.days[0][0]).toBe('2026-04-05');
    expect(cells.map((cell) => cell.minute)).toEqual([
      60,
      75,
      90,
      105,
      90,
      105,
      120,
      135,
    ]);
    expect(cells.map((cell) => cell.occurrence)).toEqual([
      0,
      0,
      0,
      0,
      1,
      1,
      0,
      0,
    ]);
    expect(new Set(cells.map((cell) => cell.offset)).size).toBe(2);
    expect(model.rows.filter((row) => row.minute === 90)).toHaveLength(2);
    expect(model.rows.filter((row) => row.minute === 60)).toHaveLength(2);
  });
});

/**
 * Build an ISO time-range fixture without additional metadata.
 * @returns A time-range fixture containing the supplied start and end strings.
 */
const span = (start: string, end: string) => ({
  start,
  end,
});

/** Group the time zones and real moments checks. */
describe('time zones and real moments', () => {
  /** Matches Los Angeles and New York without separate local-time copies. */
  it('matches Los Angeles and New York without separate local-time copies', () => {
    expect(localToUTC('2027-01-15', '10:00', 'America/Los_Angeles')).toBe(
      localToUTC('2027-01-15', '13:00', 'America/New_York'),
    );
    expect(localToUTC('2027-01-15', '10:00', 'America/Los_Angeles')).toBe(
      '2027-01-15T18:00:00Z',
    );
  });
  /**
   * Uses the date-specific daylight saving offset and fractional-hour
   * zones.
   */
  it('uses the date-specific daylight saving offset and fractional-hour zones', () => {
    expect(localToUTC('2027-07-15', '10:00', 'America/Los_Angeles')).toBe(
      '2027-07-15T17:00:00Z',
    );
    expect(localToUTC('2027-01-15', '10:00', 'Asia/Kolkata')).toBe(
      '2027-01-15T04:30:00Z',
    );
  });
  /**
   * Rejects nonexistent and repeated local start times rather than
   * guessing.
   */
  it('rejects nonexistent and repeated local start times rather than guessing', () => {
    expect(
      /* Attempt a nonexistent spring-forward time to assert its rejection. */
      () => localToUTC('2027-03-14', '02:30', 'America/Los_Angeles'),
    ).toThrow();
    expect(
      /* Attempt a repeated fall-back time to assert ambiguous-time rejection. */
      () => localToUTC('2026-11-01', '01:30', 'America/Los_Angeles'),
    ).toThrow();
  });
  /** Rolls midnight to the next date. */
  it('rolls midnight to the next date', () =>
    expect(localToUTC('2027-01-15', '24:00', 'UTC')).toBe(
      '2027-01-16T00:00:00Z',
    ));
  /** Changes local calendar dates without changing stored moments. */
  it('changes local calendar dates without changing stored moments', () => {
    const windows = [span('2027-01-15T22:00:00Z', '2027-01-15T23:00:00Z')];
    expect(localDate(windows[0].start, 'Asia/Tokyo')).toBe('2027-01-16');
    expect(gridModel(windows, 'Asia/Tokyo').days[0][0]).toBe('2027-01-16');
    expect(allSlots(windows)).toEqual(
      gridModel(windows, 'Asia/Tokyo').days.flatMap(
        /* Flatten displayed date columns into their stored slot timestamps. */
        ([, c]) =>
          c.map(
            /* Read one displayed cell's underlying instant. */
            (v) => v.stamp,
          ),
      ),
    );
  });
  /** Keeps both repeated hours distinct on the fall-back date. */
  it('keeps both repeated hours distinct on the fall-back date', () => {
    const windows = [
      span(
        localToUTC('2026-11-01', '00:00', 'America/Los_Angeles'),
        localToUTC('2026-11-01', '04:00', 'America/Los_Angeles'),
      ),
    ];
    const model = gridModel(windows, 'America/Los_Angeles');
    expect(model.days[0][1]).toHaveLength(20);
    const repeated = model.days[0][1].filter(
      /* Select both occurrences of the repeated 01:30 clock minute. */
      (c) => c.minute === 90,
    );
    expect(repeated).toHaveLength(2);
    expect(repeated[0].stamp).not.toBe(repeated[1].stamp);
    expect(
      model.rows.filter(
        /* Find grid rows corresponding to that repeated local minute. */
        (r) => r.minute === 90,
      ),
    ).toHaveLength(2);
  });
  /** Has no selectable cells for the spring-forward missing hour. */
  it('has no selectable cells for the spring-forward missing hour', () => {
    const model = gridModel(
      [
        span(
          localToUTC('2027-03-14', '00:00', 'America/Los_Angeles'),
          localToUTC('2027-03-14', '04:00', 'America/Los_Angeles'),
        ),
      ],
      'America/Los_Angeles',
    );
    expect(model.days[0][1]).toHaveLength(12);
    expect(
      model.days[0][1].some(
        /* Check whether nonexistent spring-forward clock minutes were incorrectly displayed. */
        (c) => c.minute >= 120 && c.minute < 180,
      ),
    ).toBe(false);
  });
});
/** Group the whole meetings and compact storage checks. */
describe('whole meetings and compact storage', () => {
  const start = Date.parse('2027-01-15T18:00Z');
  /** Merges consecutive slots into one range. */
  it('merges consecutive slots into one range', () =>
    expect(
      slotsToRanges([
        start,
        start + SLOT,
        start + 2 * SLOT,
        start,
      ]),
    ).toEqual([span('2027-01-15T18:00:00.000Z', '2027-01-15T18:45:00.000Z')]));
  /** Does not bridge a gap. */
  it('does not bridge a gap', () =>
    expect(
      contains(
        [
          span('2027-01-15T18:00Z', '2027-01-15T18:30Z'),
          span('2027-01-15T18:45Z', '2027-01-15T19:00Z'),
        ],
        start,
        start + 4 * SLOT,
      ),
    ).toBe(false));
  /** Rejects forged availability outside the event and off-grid times. */
  it('rejects forged availability outside the event and off-grid times', () => {
    const windows = [span('2027-01-15T18:00Z', '2027-01-15T19:00Z')];
    expect(
      /* Submit a range outside the fixture event to verify rejection. */
      () =>
        validateRanges(
          [span('2027-01-15T17:00Z', '2027-01-15T18:00Z')],
          windows,
        ),
    ).toThrow();
    expect(
      /* Submit a misaligned range to verify complete-slot validation. */
      () =>
        validateRanges(
          [span('2027-01-15T18:01Z', '2027-01-15T18:16Z')],
          windows,
        ),
    ).toThrow();
    expect(
      /* Submit timestamps without offsets to verify timezone validation. */
      () =>
        validateRanges([span('2027-01-15T18:00', '2027-01-15T18:15')], windows),
    ).toThrow();
  });
});

/** Group the 30-minute display with 15-minute storage checks. */
describe('30-minute display with 15-minute storage', () => {
  /** Fixed half-hour rows must not drop saved quarter-hours. */
  it('uses fixed half-hour rows without dropping saved quarter-hours', () => {
    const windows = [span('2027-01-15T09:15:00Z', '2027-01-15T10:45:00Z')];
    const model = gridModel(windows, 'UTC');
    expect(model.rows.map((row) => row.minute)).toEqual([
      540,
      570,
      600,
      630,
    ]);
    expect(
      model.days[0][1].map(
        /* Compare the underlying instants retained by the coarser grid. */
        (c) => c.stamp,
      ),
    ).toEqual(allSlots(windows));
    expect(slotsToRanges(new Set([Date.parse('2027-01-15T09:15Z')]))).toEqual([
      span('2027-01-15T09:15:00.000Z', '2027-01-15T09:30:00.000Z'),
    ]);
  });
  /** Preserves both repeated-hour occurrences in half-hour rows. */
  it('preserves both repeated-hour occurrences in half-hour rows', () => {
    const windows = [
      span(
        localToUTC('2026-11-01', '00:00', 'America/Los_Angeles'),
        localToUTC('2026-11-01', '04:00', 'America/Los_Angeles'),
      ),
    ];
    const model = gridModel(windows, 'America/Los_Angeles');
    expect(
      model.rows.filter(
        /* Select repeated clock-minute rows in the coarse DST grid. */
        (r) => r.minute === 90,
      ),
    ).toHaveLength(2);
    expect(model.days[0][1]).toHaveLength(20);
  });
});
