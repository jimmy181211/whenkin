import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  revealRequiredField,
  type RequiredField,
} from '../App/frontend/utils/reveal-required-field';

let events: EventTarget;
let page: { onscrollend?: null };
const viewport = {
  scrollX: 0,
  scrollY: 800,
  innerHeight: 800,
  scrollTo: vi.fn(),
  matchMedia: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

/** Dispatch an observed native event with the page or a nested container as its target. */
function emit(type: string, target: object = page) {
  const event = new Event(type);
  Object.defineProperty(event, 'target', { value: target });
  events.dispatchEvent(event);
}

/** Reset native browser events and fake the safety timer, without simulating animation frames. */
beforeEach(() => {
  vi.useFakeTimers();
  events = new EventTarget();
  page = { onscrollend: null };
  viewport.scrollY = 800;
  viewport.scrollTo.mockReset();
  viewport.matchMedia.mockReturnValue({ matches: false });
  viewport.addEventListener = vi.fn(events.addEventListener.bind(events));
  viewport.removeEventListener = vi.fn(events.removeEventListener.bind(events));
  vi.stubGlobal('window', viewport);
  vi.stubGlobal('document', page);
});
/** Restore globals and timers after each native-scroll test. */
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Return an input-like fixture with browser-controlled scrolling and a focus spy. */
function field() {
  return {
    value: '',
    isConnected: true,
    focus: vi.fn(),
    /** Model native scrolling, leaving completion to the test's scrollend event. */
    scrollIntoView: vi.fn(() => {
      viewport.scrollY = 0;
      emit('scroll');
    }),
    /** Report the field's screen position without moving it. */
    getBoundingClientRect: () => ({ top: 200 - viewport.scrollY, bottom: 240 - viewport.scrollY }),
  } as unknown as RequiredField;
}

/** Verify browser-native completion, fallbacks, and obsolete-reminder cancellation. */
describe('native required-field reveal', () => {
  /** Wait for the real end event before focusing; release every listener and timer afterward. */
  it('uses smooth scrolling and waits for native scrollend', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    expect(input.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    expect(input.focus).not.toHaveBeenCalled();
    emit('scrollend');
    expect(await ready).toBe(true);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(vi.getTimerCount()).toBe(0);
    const calls = viewport.scrollTo.mock.calls.length;
    emit('wheel');
    expect(viewport.scrollTo).toHaveBeenCalledTimes(calls);
  });
  /** No movement means no end event, so visible fields must not wait for one. */
  it('focuses an already visible field without scrolling', async () => {
    viewport.scrollY = 0;
    const input = field();
    expect(await revealRequiredField(input, new AbortController().signal)).toBe(true);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });
  /** Use a built-in instant scroll for reduced motion or older browsers, not a custom fallback. */
  it('uses native instant scrolling when smooth completion cannot be used', async () => {
    for (const reducedMotion of [true, false]) {
      viewport.scrollY = 800;
      viewport.matchMedia.mockReturnValue({ matches: reducedMotion });
      page = reducedMotion ? { onscrollend: null } : {};
      vi.stubGlobal('document', page);
      const input = field();
      expect(await revealRequiredField(input, new AbortController().signal)).toBe(true);
      expect(input.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'center',
        inline: 'nearest',
      });
      expect(vi.getTimerCount()).toBe(0);
    }
  });
  /** Cancelling resolves immediately without taking focus or controlling browser scrolling. */
  it('cancels an obsolete reminder immediately', async () => {
    const input = field();
    const controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    controller.abort();
    expect(await ready).toBe(false);
    expect(input.focus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(viewport.scrollTo).not.toHaveBeenCalled();
    emit('scrollend');
    expect(input.focus).not.toHaveBeenCalled();
  });
  /** A signal canceled before the reveal must not scroll or focus the field. */
  it('ignores an already aborted reminder', async () => {
    const input = field();
    const controller = new AbortController();
    controller.abort();
    expect(await revealRequiredField(input, controller.signal)).toBe(false);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
    expect(input.focus).not.toHaveBeenCalled();
  });
  /** Track all native scroll targets so an early ancestor end cannot reveal the reminder. */
  it('waits for both page and nested scrolling to end', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    const container = {};
    emit('scroll', container);
    emit('scrollend');
    expect(input.focus).not.toHaveBeenCalled();
    emit('scrollend', container);
    expect(await ready).toBe(true);
  });
  /** End events unrelated to this scroll must not complete its reminder. */
  it('ignores unrelated scrollend events', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    emit('scrollend', {});
    expect(input.focus).not.toHaveBeenCalled();
    emit('scrollend');
    expect(await ready).toBe(true);
  });
  /** Do not interrupt someone who filled the field while the browser was scrolling. */
  it('does not focus a field filled before scrolling ends', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    input.value = 'Already filled';
    emit('scrollend');
    expect(await ready).toBe(false);
  });
  /** Manual gestures cancel the reminder without changing the browser's default input behavior. */
  it.each(['wheel', 'touchmove', 'keydown', 'resize', 'pointerdown'])(
    'yields to a user interruption: %s',
    async (type) => {
      const input = field();
      const ready = revealRequiredField(input, new AbortController().signal);
      emit(type);
      expect(await ready).toBe(false);
    },
  );
  /** A missing end event must not leave the promise or its listeners alive indefinitely. */
  it('cleans up when no scrollend event arrives', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    vi.advanceTimersByTime(5000);
    expect(await ready).toBe(false);
    expect(input.focus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
