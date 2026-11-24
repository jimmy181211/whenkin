/** Verifies shared layout tracking reacts to changes and cleans up independently. */
import {
  afterEach,
  expect,
  it,
  vi,
} from 'vitest';
import { observeOverlayLayout } from '../App/frontend/utils/observe-overlay-layout';

/** Restore browser globals replaced by the layout fixtures. */
afterEach(() => vi.unstubAllGlobals());

/**
 * Provide viewport events and a controllable ResizeObserver without a real DOM.
 * @returns Event targets, observer callbacks and spies for subscription cleanup.
 */
function layoutBrowser() {
  const viewport = new EventTarget();
  const target = Object.assign(new EventTarget(), { visualViewport: viewport });
  const observed = vi.fn();
  const disconnected = vi.fn();
  const callbacks: (() => void)[] = [];
  vi.stubGlobal('window', target);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      /** Retain each callback so the test can simulate an element resizing. */
      constructor(callback: () => void) {
        callbacks.push(callback);
      }

      /** Record elements whose dimensions should be tracked. */
      observe(element: Element) {
        observed(element);
      }

      /** Record disconnection without touching another observer. */
      disconnect() {
        disconnected();
      }
    },
  );
  return {
    viewport,
    target,
    observed,
    disconnected,
    callbacks,
  };
}

/** All layout sources remeasure; cleanup uses the originally subscribed viewport. */
it('tracks elements and viewport events and removes every listener on cleanup', () => {
  const browser = layoutBrowser();
  const panel = {} as Element;
  const anchor = {} as Element;
  const measure = vi.fn();
  const cleanup = observeOverlayLayout(measure, [
    panel,
    null,
    anchor,
  ]);
  expect(measure).toHaveBeenCalledOnce();
  expect(browser.observed.mock.calls).toEqual([
    [panel],
    [anchor],
  ]);
  browser.target.dispatchEvent(new Event('scroll'));
  browser.target.dispatchEvent(new Event('resize'));
  browser.viewport.dispatchEvent(new Event('scroll'));
  browser.viewport.dispatchEvent(new Event('resize'));
  browser.callbacks[0]();
  expect(measure).toHaveBeenCalledTimes(6);
  browser.target.visualViewport = new EventTarget();
  cleanup();
  expect(browser.disconnected).toHaveBeenCalledOnce();
  browser.target.dispatchEvent(new Event('scroll'));
  browser.target.dispatchEvent(new Event('resize'));
  browser.viewport.dispatchEvent(new Event('scroll'));
  browser.viewport.dispatchEvent(new Event('resize'));
  expect(measure).toHaveBeenCalledTimes(6);
});

/** Closing one overlay must not stop another open overlay from following scrolling. */
it('keeps concurrent overlay subscriptions independent', () => {
  const browser = layoutBrowser();
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = observeOverlayLayout(first, []);
  const stopSecond = observeOverlayLayout(second, []);
  stopFirst();
  browser.target.dispatchEvent(new Event('scroll'));
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledTimes(2);
  stopSecond();
  browser.target.dispatchEvent(new Event('scroll'));
  expect(second).toHaveBeenCalledTimes(2);
  expect(browser.disconnected).toHaveBeenCalledTimes(2);
});
