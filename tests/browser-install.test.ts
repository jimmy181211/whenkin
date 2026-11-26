import { describe, expect, it, vi } from 'vitest';
import { BrowserInstall } from '../App/frontend/utils/browser-install';

/**
 * Create an install manager, event target, and browser-prompt fixture.
 * @returns An isolated install manager with its event target, prompt fixture, and listener cleanup.
 */
function setup() {
  const target = new EventTarget();
  const install = new BrowserInstall();
  const dispose = install.listen(target);

  /**
   * Offer a simulated one-use install prompt with the chosen user outcome.
   * @returns The dispatched browser-prompt fixture, ready for choice and consumption assertions.
   */
  const offer = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn<() => Promise<unknown>>(
        /* Complete the simulated native prompt without additional side effects. */
        async () => undefined,
      ),
      userChoice: Promise.resolve({ outcome }),
    });
    target.dispatchEvent(event);
    return event;
  };

  return { target, install, offer, dispose };
}

/** Group the browser-owned shortcut prompt checks. */
describe('browser-owned shortcut prompt', () => {
  /** Falls back when the browser has not supplied a native prompt. */
  it('falls back when the browser has not supplied a native prompt', async () => {
    expect(await setup().install.prompt()).toBe('unavailable');
  });
  /**
   * Calls the real prompt synchronously within the click, then consumes it
   * once.
   */
  it('calls the real prompt synchronously within the click, then consumes it once', async () => {
    const { install, offer } = setup();
    const event = offer();
    expect(event.defaultPrevented).toBe(true);
    const result = install.prompt();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(await result).toBe('accepted');
    expect(await install.prompt()).toBe('unavailable');
  });
  /** Respects cancellation without immediately showing more instructions. */
  it('respects cancellation without immediately showing more instructions', async () => {
    const { install, offer } = setup();
    offer('dismissed');
    expect(await install.prompt()).toBe('dismissed');
    expect(await install.prompt()).toBe('unavailable');
  });
  /** Falls back if the browser refuses to show the prompt. */
  it('falls back if the browser refuses to show the prompt', async () => {
    const { install, offer } = setup();
    const event = offer();
    event.prompt.mockRejectedValueOnce(new Error('not allowed'));
    expect(await install.prompt()).toBe('unavailable');
  });
  /**
   * Does not open duplicate prompts while a browser confirmation is
   * pending.
   */
  it('does not open duplicate prompts while a browser confirmation is pending', async () => {
    const { install, offer } = setup();
    const event = offer();
    let resolve!: () => void;
    event.prompt.mockImplementationOnce(
      /** Keep the prompt unresolved so a second click can be tested. */
      () =>
        new Promise<void>(
          /* Expose the completion callback for the pending prompt fixture. */
          (done) => {
            resolve = done;
          },
        ),
    );
    const first = install.prompt();
    expect(await install.prompt()).toBe('pending');
    resolve();
    expect(await first).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
  });
  /** Clears stale offers when installation completes outside this button. */
  it('clears stale offers when installation completes outside this button', async () => {
    const { install, offer, target } = setup();
    const event = offer();
    target.dispatchEvent(new Event('appinstalled'));
    expect(await install.prompt()).toBe('unavailable');
    expect(event.prompt).not.toHaveBeenCalled();
  });
  /** Can use a fresh browser offer after a dismissal. */
  it('can use a fresh browser offer after a dismissal', async () => {
    const { install, offer } = setup();
    offer('dismissed');
    await install.prompt();
    const fresh = offer();
    expect(await install.prompt()).toBe('accepted');
    expect(fresh.prompt).toHaveBeenCalledOnce();
  });
  /** Releases listeners and ignores events without a native prompt method. */
  it('releases listeners and ignores events without a native prompt method', async () => {
    const { install, offer, target, dispose } = setup();
    target.dispatchEvent(new Event('beforeinstallprompt'));
    expect(await install.prompt()).toBe('unavailable');
    dispose();
    const event = offer();
    expect(event.defaultPrevented).toBe(false);
    expect(await install.prompt()).toBe('unavailable');
  });
});
