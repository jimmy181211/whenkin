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
  /** Halves display rows without dropping saved quarter-hours. */
  it('halves display rows without dropping saved quarter-hours', () => {
    const windows = [span('2027-01-15T09:15:00Z', '2027-01-15T10:45:00Z')];
    const fine = gridModel(windows, 'UTC');
    const coarse = gridModel(windows, 'UTC', 30);
    expect(coarse.rows).toHaveLength(fine.rows.length / 2);
    expect(coarse.days).toEqual(fine.days);
    expect(
      coarse.days[0][1].map(
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
    const model = gridModel(windows, 'America/Los_Angeles', 30);
    expect(
      model.rows.filter(
        /* Select repeated clock-minute rows in the coarse DST grid. */
        (r) => r.minute === 90,
      ),
    ).toHaveLength(2);
    expect(model.days[0][1]).toHaveLength(20);
  });
});
