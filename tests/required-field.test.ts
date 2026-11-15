import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealRequiredField, REQUIRED_FIELD_SCROLL_MS, type RequiredField } from '../App/frontend/utils/reveal-required-field';

let clock = 0, nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
function makeViewport() {
  const state = { y: 800 }, events = new EventTarget();
  return {
    get scrollY() { return state.y; }, innerHeight: 800,
    scrollTo: vi.fn(({ top }: ScrollToOptions) => { state.y = top ?? 0; }),
    matchMedia: vi.fn(() => ({ matches: false })),
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events),
  };
}
let viewport: ReturnType<typeof makeViewport>;
beforeEach(() => {
  clock = 0; nextFrame = 0; frames.clear(); viewport = makeViewport();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.stubGlobal('window', viewport);
  const root = { scrollHeight: 2600 };
  vi.stubGlobal('document', { scrollingElement: root, documentElement: root, body: null });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function field() {
  return { value: '', isConnected: true, parentElement: null, focus: vi.fn(), getBoundingClientRect: () => ({ top: 200 - viewport.scrollY, bottom: 240 - viewport.scrollY, height: 40 }) } as unknown as RequiredField;
}
function advance(count: number) {
  for (let step = 0; step < count; step++) {
    clock += 20;
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) callback(clock);
  }
}
describe('shared required-field reveal', () => {
  it('animates through intermediate positions for 650ms before focusing without another jump', async () => {
    const input = field(), controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    advance(10);
    expect(viewport.scrollY).toBeGreaterThan(0); expect(viewport.scrollY).toBeLessThan(800);
    expect(input.focus).not.toHaveBeenCalled();
    advance(22); expect(clock).toBeLessThan(REQUIRED_FIELD_SCROLL_MS);
    expect(input.focus).not.toHaveBeenCalled(); advance(1);
    expect(await ready).toBe(true);
    expect(viewport.scrollY).toBe(0);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('keeps short desktop scrolls just as gradual as longer mobile scrolls', async () => {
    viewport.scrollTo({ top: 60 });
    const input = field(), ready = revealRequiredField(input, new AbortController().signal);
    advance(10);
    expect(viewport.scrollY).toBeGreaterThan(0); expect(viewport.scrollY).toBeLessThan(60);
    expect(input.focus).not.toHaveBeenCalled();
    advance(23); expect(await ready).toBe(true); expect(viewport.scrollY).toBe(0);
  });
  it('cancels pending focus when the page or reminder is dismissed', async () => {
    const input = field(), controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    controller.abort();
    expect(await ready).toBe(false);
    expect(frames.size).toBe(0);
    expect(input.focus).not.toHaveBeenCalled();
  });
  it('does not interrupt someone who has already filled the field during scrolling', async () => {
    const input = field(), ready = revealRequiredField(input, new AbortController().signal);
    input.value = 'Already filled'; advance(1);
    expect(await ready).toBe(false);
    expect(input.focus).not.toHaveBeenCalled();
  });
  it('respects reduced motion while keeping focus from scrolling again', async () => {
    viewport.matchMedia.mockReturnValue({ matches: true });
    const input = field();
    expect(await revealRequiredField(input, new AbortController().signal)).toBe(true);
    expect(viewport.scrollY).toBe(0); expect(frames.size).toBe(0);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('yields control when the user scrolls manually during the animation', async () => {
    const input = field(), ready = revealRequiredField(input, new AbortController().signal);
    advance(10); const stoppedAt = viewport.scrollY;
    viewport.dispatchEvent(new Event('wheel')); advance(30);
    expect(await ready).toBe(false); expect(viewport.scrollY).toBe(stoppedAt);
    expect(input.focus).not.toHaveBeenCalled();
  });
  it('can reveal a field inside a scrollable panel without moving the page', async () => {
    viewport.scrollTo({ top: 0 }); viewport.scrollTo.mockClear();
    const container = { scrollTop: 0, scrollHeight: 900, clientHeight: 200, clientTop: 0, parentElement: null, getBoundingClientRect: () => ({ top: 200 }), scrollTo: vi.fn(({ top }: ScrollToOptions) => { container.scrollTop = top ?? 0; }) };
    vi.stubGlobal('getComputedStyle', () => ({ overflowY: 'auto' }));
    const input = field(); Object.defineProperty(input, 'parentElement', { value: container });
    input.getBoundingClientRect = () => ({ top: 800 - container.scrollTop, bottom: 840 - container.scrollTop, height: 40 }) as DOMRect;
    const ready = revealRequiredField(input, new AbortController().signal); advance(33);
    expect(await ready).toBe(true); expect(container.scrollTop).toBe(520);
    expect(viewport.scrollTo).not.toHaveBeenCalled();
  });
});
