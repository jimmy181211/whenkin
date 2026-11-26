import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(
  /* Reset module state so guide-dismissal tests do not affect one another. */
  () => vi.resetModules(),
);

/**
 * Provide optional browser-storage behavior backed by an isolated map.
 * @returns Independent getItem/setItem operations backed by an initially empty map.
 */
const storage = () => {
  const data = new Map<string, string>();
  return {
    /* Read a saved guide outcome or return null when absent. */
    getItem: (key: string) => data.get(key) ?? null,
    /* Save a guide outcome in the fixture's storage map. */
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

/** Group the first-visit event guide checks. */
describe('first-visit event guide', () => {
  /** A new session owns fresh dismissal state even when storage is unavailable. */
  it('keeps dismissal in the owning service instance', async () => {
    const { EventTourService } = await import('../App/frontend/utils/event-tour');
    const first = new EventTourService();
    const second = new EventTourService();
    first.finish('skipped', null);
    expect(first.shouldOffer(null)).toBe(false);
    expect(second.shouldOffer(null)).toBe(true);
  });

  /** Offers the guide without recording completion just for opening a page. */
  it('offers the guide without recording completion just for opening a page', async () => {
    const { tourService, EVENT_TOUR_KEY } = await import('../App/frontend/utils/event-tour');
    const saved = storage();
    expect(tourService.shouldOffer(saved)).toBe(true);
    expect(saved.getItem(EVENT_TOUR_KEY)).toBeNull();
    expect(tourService.shouldOffer(saved)).toBe(true);
  });
  /**
   * Check that either recorded guide outcome suppresses the next welcome
   * prompt.
   */
  it.each(['skipped', 'completed'] as const)(
    'remembers %s across event visits and page reloads',

    async (outcome) => {
      const saved = storage();
      const tour = await import('../App/frontend/utils/event-tour');
      tour.tourService.finish(outcome, saved);
      expect(tour.tourService.shouldOffer(saved)).toBe(false);
      expect(saved.getItem(tour.EVENT_TOUR_KEY)).toBe(outcome);
      vi.resetModules();
      expect(
        (await import('../App/frontend/utils/event-tour')).tourService.shouldOffer(saved),
      ).toBe(false);
    },
  );
  /** Can be dismissed for this session when browser storage is blocked. */
  it('can be dismissed for this session when browser storage is blocked', async () => {
    const blocked = {
      /** Simulate browser storage that rejects reads. */
      getItem() {
        throw Error('blocked');
      },
      /** Simulate browser storage that rejects writes. */
      setItem() {
        throw Error('blocked');
      },
    };
    const tour = await import('../App/frontend/utils/event-tour');
    expect(tour.tourService.shouldOffer(blocked)).toBe(true);
    expect(
      /* Check dismissal remains safe when persisting its outcome fails. */
      () => tour.tourService.finish('skipped', blocked),
    ).not.toThrow();
    expect(tour.tourService.shouldOffer(blocked)).toBe(false);
  });
  /** Does not mistake an unrecognized storage value for a finished guide. */
  it('does not mistake an unrecognized storage value for a finished guide', async () => {
    const tour = await import('../App/frontend/utils/event-tour');
    const saved = storage();
    saved.setItem(tour.EVENT_TOUR_KEY, 'started');
    expect(tour.tourService.shouldOffer(saved)).toBe(true);
  });
  /**
   * Provides six concise localized steps while retaining the personal
   * introduction.
   */
  it('provides six concise localized steps while retaining the personal introduction', async () => {
    const { tourCopy, tourSteps } = await import('../App/frontend/utils/event-tour');
    expect(
      tourSteps.map(
        /* Compare the guide's ordered step keys. */
        (step) => step.key,
      ),
    ).toEqual(['personal', 'group', 'responders', 'sharedTimes', 'share', 'shortcut']);
    for (const copy of Object.values(tourCopy)) {
      expect(copy.start).toBeTruthy();
      expect(copy.skip).toBeTruthy();
      for (const step of tourSteps) {
        expect(copy[step.key][0].length).toBeGreaterThan(1);
        expect(copy[step.key][1].length).toBeGreaterThan(5);
        expect(copy[step.key][1].length).toBeLessThan(200);
      }
    }
    expect(tourCopy.en.personal[1]).toBe(
      'View or edit your response, then click Save Availability.',
    );
    expect(tourCopy.zh.personal[1]).toBe('查看或修改空闲时间，然后点击“保存空闲时间”。');
  });
});
