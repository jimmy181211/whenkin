import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  revealRequiredField,
  REQUIRED_FIELD_SCROLL_MS,
  type RequiredField,
} from '../App/frontend/utils/reveal-required-field';

let clock = 0;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();

/**
 * Create a controllable browser viewport for required-field animation
 * tests.
 * @returns A controllable viewport with a mutable scroll position and observable browser operations.
 */
function makeViewport() {
  const state = { y: 800 };
  const events = new EventTarget();
  return {
    /** Read the viewport fixture's simulated page offset. */
    get scrollY() {
      return state.y;
    },
    innerHeight: 800,
    scrollTo: vi.fn(
      /* Apply a requested scroll offset to the viewport fixture. */
      ({ top }: ScrollToOptions) => {
        state.y = top ?? 0;
      },
    ),
    matchMedia: vi.fn(
      /* Keep reduced motion disabled for the animated-scroll scenario. */
      () => ({
        matches: false,
      }),
    ),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
}

let viewport: ReturnType<typeof makeViewport>;
beforeEach(
  /* Reset the simulated clock, frame queue, viewport, and browser APIs. */
  () => {
    clock = 0;
    nextFrame = 0;
    frames.clear();
    viewport = makeViewport();
    vi.spyOn(performance, 'now').mockImplementation(
      /* Return the controlled animation clock instead of real elapsed time. */
      () => clock,
    );
    vi.stubGlobal('window', viewport);
    const root = { scrollHeight: 2600 };
    vi.stubGlobal('document', {
      scrollingElement: root,
      documentElement: root,
      body: null,
    });
    vi.stubGlobal(
      'requestAnimationFrame',
      /* Queue an animation frame and return its cancelable fixture id. */
      (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      },
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      /* Remove a canceled animation frame from the fixture queue. */
      (id: number) => frames.delete(id),
    );
  },
);
afterEach(
  /* Restore mocked APIs and browser globals after each animation test. */
  () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  },
);

/**
 * Build an empty required field whose bounds reflect simulated page
 * scrolling.
 * @returns An empty input-like fixture with a focus spy and bounds affected by viewport scrolling.
 */
function field() {
  return {
    value: '',
    isConnected: true,
    parentElement: null,
    focus: vi.fn(),
    /**
     * Report the field's current viewport bounds after simulated scroll
     * movement.
     */
    getBoundingClientRect: () => ({
      top: 200 - viewport.scrollY,
      bottom: 240 - viewport.scrollY,
      height: 40,
    }),
  } as unknown as RequiredField;
}

/**
 * Advance queued animation callbacks in deterministic twenty-millisecond
 * steps.
 */
function advance(count: number) {
  for (let step = 0; step < count; step++) {
    clock += 20;
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) {
      callback(clock);
    }
  }
}

/** Group the shared required-field reveal checks. */
describe('shared required-field reveal', () => {
  /**
   * Animates through intermediate positions for 650ms before focusing
   * without another jump.
   */
  it('animates through intermediate positions for 650ms before focusing without another jump', async () => {
    const input = field();
    const controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    advance(10);
    expect(viewport.scrollY).toBeGreaterThan(0);
    expect(viewport.scrollY).toBeLessThan(800);
    expect(input.focus).not.toHaveBeenCalled();
    advance(22);
    expect(clock).toBeLessThan(REQUIRED_FIELD_SCROLL_MS);
    expect(input.focus).not.toHaveBeenCalled();
    advance(1);
    expect(await ready).toBe(true);
    expect(viewport.scrollY).toBe(0);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  /** Keeps short desktop scrolls just as gradual as longer mobile scrolls. */
  it('keeps short desktop scrolls just as gradual as longer mobile scrolls', async () => {
    viewport.scrollTo({ top: 60 });
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    advance(10);
    expect(viewport.scrollY).toBeGreaterThan(0);
    expect(viewport.scrollY).toBeLessThan(60);
    expect(input.focus).not.toHaveBeenCalled();
    advance(23);
    expect(await ready).toBe(true);
    expect(viewport.scrollY).toBe(0);
  });
  /** Cancels pending focus when the page or reminder is dismissed. */
  it('cancels pending focus when the page or reminder is dismissed', async () => {
    const input = field();
    const controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    controller.abort();
    expect(await ready).toBe(false);
    expect(frames.size).toBe(0);
    expect(input.focus).not.toHaveBeenCalled();
  });
  /**
   * Does not interrupt someone who has already filled the field during
   * scrolling.
   */
  it('does not interrupt someone who has already filled the field during scrolling', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    input.value = 'Already filled';
    advance(1);
    expect(await ready).toBe(false);
    expect(input.focus).not.toHaveBeenCalled();
  });
  /** Respects reduced motion while keeping focus from scrolling again. */
  it('respects reduced motion while keeping focus from scrolling again', async () => {
    viewport.matchMedia.mockReturnValue({ matches: true });
    const input = field();
    expect(await revealRequiredField(input, new AbortController().signal)).toBe(
      true,
    );
    expect(viewport.scrollY).toBe(0);
    expect(frames.size).toBe(0);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  /** Yields control when the user scrolls manually during the animation. */
  it('yields control when the user scrolls manually during the animation', async () => {
    const input = field();
    const ready = revealRequiredField(input, new AbortController().signal);
    advance(10);
    const stoppedAt = viewport.scrollY;
    viewport.dispatchEvent(new Event('wheel'));
    advance(30);
    expect(await ready).toBe(false);
    expect(viewport.scrollY).toBe(stoppedAt);
    expect(input.focus).not.toHaveBeenCalled();
  });
  /** Can reveal a field inside a scrollable panel without moving the page. */
  it('can reveal a field inside a scrollable panel without moving the page', async () => {
    viewport.scrollTo({ top: 0 });
    viewport.scrollTo.mockClear();
    const container = {
      scrollTop: 0,
      scrollHeight: 900,
      clientHeight: 200,
      clientTop: 0,
      parentElement: null,
      /** Provide the nested scroll container's fixed screen position. */
      getBoundingClientRect: () => ({
        top: 200,
      }),
      scrollTo: vi.fn(
        /* Apply a simulated scroll to the inner container. */
        ({ top }: ScrollToOptions) => {
          container.scrollTop = top ?? 0;
        },
      ),
    };
    vi.stubGlobal(
      'getComputedStyle',
      /* Mark the fixture container as vertically scrollable. */
      () => ({
        overflowY: 'auto',
      }),
    );
    const input = field();
    Object.defineProperty(input, 'parentElement', { value: container });
    input.getBoundingClientRect =
      /* Report field bounds relative to the inner container's changing scroll offset. */
      () =>
        ({
          top: 800 - container.scrollTop,
          bottom: 840 - container.scrollTop,
          height: 40,
        }) as DOMRect;
    const ready = revealRequiredField(input, new AbortController().signal);
    advance(33);
    expect(await ready).toBe(true);
    expect(container.scrollTop).toBe(520);
    expect(viewport.scrollTo).not.toHaveBeenCalled();
  });
});
