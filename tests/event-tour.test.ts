import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
};
describe('first-visit event guide', () => {
  it('offers the guide without recording completion just for opening a page', async () => {
    const { shouldOfferTour, EVENT_TOUR_KEY } = await import('../App/frontend/utils/event-tour');
    const saved = storage();
    expect(shouldOfferTour(saved)).toBe(true);
    expect(saved.getItem(EVENT_TOUR_KEY)).toBeNull();
    expect(shouldOfferTour(saved)).toBe(true);
  });
  it.each(['skipped', 'completed'] as const)('remembers %s across event visits and page reloads', async outcome => {
    const saved = storage();
    const tour = await import('../App/frontend/utils/event-tour');
    tour.finishTour(outcome, saved);
    expect(tour.shouldOfferTour(saved)).toBe(false);
    expect(saved.getItem(tour.EVENT_TOUR_KEY)).toBe(outcome);
    vi.resetModules();
    expect((await import('../App/frontend/utils/event-tour')).shouldOfferTour(saved)).toBe(false);
  });
  it('can be dismissed for this session when browser storage is blocked', async () => {
    const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
    const tour = await import('../App/frontend/utils/event-tour');
    expect(tour.shouldOfferTour(blocked)).toBe(true);
    expect(() => tour.finishTour('skipped', blocked)).not.toThrow();
    expect(tour.shouldOfferTour(blocked)).toBe(false);
  });
  it('does not mistake an unrecognized storage value for a finished guide', async () => {
    const tour = await import('../App/frontend/utils/event-tour');
    const saved = storage(); saved.setItem(tour.EVENT_TOUR_KEY, 'started');
    expect(tour.shouldOfferTour(saved)).toBe(true);
  });
  it('introduces responders and shared-time highlighting before the unchanged sharing step', async () => {
    const { tourCopy, tourSteps } = await import('../App/frontend/utils/event-tour');
    expect(tourSteps.map(step => step.key)).toEqual(['personal', 'group', 'responders', 'sharedTimes', 'share']);
    for (const copy of Object.values(tourCopy)) {
      expect(copy.start).toBeTruthy(); expect(copy.skip).toBeTruthy();
      for (const step of tourSteps) {
        expect(copy[step.key][0].length).toBeGreaterThan(1);
        expect(copy[step.key][1].length).toBeGreaterThan(5);
        expect(copy[step.key][1].length).toBeLessThan(200);
      }
    }
    expect(tourCopy.en.share).toEqual(['Share the event', 'Copy the link through Share Event, or copy the URL from your browser’s address bar. Both open the same event.']);
    expect(tourCopy.zh.share).toEqual(['分享活动', '在“分享活动”中复制链接，或直接复制浏览器地址栏的网址，效果一样。']);
    expect(tourCopy.es.share).toEqual(['Comparte el evento', 'Copia el enlace desde Compartir Evento o la URL de la barra de direcciones. Ambos abren el mismo evento.']);
  });
});
