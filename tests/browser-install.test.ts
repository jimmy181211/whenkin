import { describe, expect, it, vi } from 'vitest';
import { BrowserInstall } from '../App/frontend/utils/browser-install';

function setup() {
  const target = new EventTarget(), install = new BrowserInstall();
  const dispose = install.listen(target);
  const offer = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn<() => Promise<unknown>>(async () => undefined), userChoice: Promise.resolve({ outcome }),
    });
    target.dispatchEvent(event);
    return event;
  };
  return { target, install, offer, dispose };
}

describe('browser-owned shortcut prompt', () => {
  it('falls back when the browser has not supplied a native prompt', async () => {
    expect(await setup().install.prompt()).toBe('unavailable');
  });
  it('calls the real prompt synchronously within the click, then consumes it once', async () => {
    const { install, offer } = setup(), event = offer();
    expect(event.defaultPrevented).toBe(true);
    const result = install.prompt();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(await result).toBe('accepted');
    expect(await install.prompt()).toBe('unavailable');
  });
  it('respects cancellation without immediately showing more instructions', async () => {
    const { install, offer } = setup(); offer('dismissed');
    expect(await install.prompt()).toBe('dismissed');
    expect(await install.prompt()).toBe('unavailable');
  });
  it('falls back if the browser refuses to show the prompt', async () => {
    const { install, offer } = setup(), event = offer();
    event.prompt.mockRejectedValueOnce(new Error('not allowed'));
    expect(await install.prompt()).toBe('unavailable');
  });
  it('does not open duplicate prompts while a browser confirmation is pending', async () => {
    const { install, offer } = setup(), event = offer();
    let resolve!: () => void;
    event.prompt.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
    const first = install.prompt();
    expect(await install.prompt()).toBe('pending');
    resolve(); expect(await first).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
  });
  it('clears stale offers when installation completes outside this button', async () => {
    const { install, offer, target } = setup(), event = offer();
    target.dispatchEvent(new Event('appinstalled'));
    expect(await install.prompt()).toBe('unavailable');
    expect(event.prompt).not.toHaveBeenCalled();
  });
  it('can use a fresh browser offer after a dismissal', async () => {
    const { install, offer } = setup(); offer('dismissed');
    await install.prompt(); const fresh = offer();
    expect(await install.prompt()).toBe('accepted');
    expect(fresh.prompt).toHaveBeenCalledOnce();
  });
  it('releases listeners and ignores events without a native prompt method', async () => {
    const { install, offer, target, dispose } = setup();
    target.dispatchEvent(new Event('beforeinstallprompt'));
    expect(await install.prompt()).toBe('unavailable');
    dispose(); const event = offer();
    expect(event.defaultPrevented).toBe(false);
    expect(await install.prompt()).toBe('unavailable');
  });
});
