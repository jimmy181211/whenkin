import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};
describe('first-visit event guide', () => {
  it('offers the guide without recording completion just for opening a page', async () => {
    const { shouldOfferTour, EVENT_TOUR_KEY } = await import('../src/lib/event-tour');
    const saved = storage();
    expect(shouldOfferTour(saved)).toBe(true);
    expect(saved.getItem(EVENT_TOUR_KEY)).toBeNull();
    expect(shouldOfferTour(saved)).toBe(true);
  });
  it.each(['skipped', 'completed'] as const)('remembers %s across event visits and page reloads', async outcome => {
    const saved = storage();
    const tour = await import('../src/lib/event-tour');
    tour.finishTour(outcome, saved);
    expect(tour.shouldOfferTour(saved)).toBe(false);
    expect(saved.getItem(tour.EVENT_TOUR_KEY)).toBe(outcome);
    vi.resetModules();
    expect((await import('../src/lib/event-tour')).shouldOfferTour(saved)).toBe(false);
  });
  it('can be dismissed for this session when browser storage is blocked', async () => {
    const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
    const tour = await import('../src/lib/event-tour');
    expect(tour.shouldOfferTour(blocked)).toBe(true);
    expect(() => tour.finishTour('skipped', blocked)).not.toThrow();
    expect(tour.shouldOfferTour(blocked)).toBe(false);
  });
  it('does not mistake an unrecognized storage value for a finished guide', async () => {
    const tour = await import('../src/lib/event-tour');
    const saved = storage(); saved.setItem(tour.EVENT_TOUR_KEY, 'started');
    expect(tour.shouldOfferTour(saved)).toBe(true);
  });
  it('provides seven concise steps with separate group guidance and both sharing methods', async () => {
    const { tourCopy, tourSteps } = await import('../src/lib/event-tour');
    expect(tourSteps.map(step => step.key)).toEqual(['name', 'grid', 'personal', 'group', 'everyone', 'responders', 'share']);
    for (const copy of Object.values(tourCopy)) {
      expect(copy.start).toBeTruthy(); expect(copy.skip).toBeTruthy();
      for (const step of tourSteps) {
        expect(copy[step.key][0].length).toBeGreaterThan(1);
        expect(copy[step.key][1].length).toBeGreaterThan(5);
        expect(copy[step.key][1].length).toBeLessThan(150);
      }
    }
    expect(tourCopy.en.share[1]).toContain('address bar');
    expect(tourCopy.zh.share[1]).toContain('地址栏');
    expect(tourCopy.es.share[1]).toContain('barra de direcciones');
  });
});
