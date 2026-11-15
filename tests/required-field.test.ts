import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealRequiredField, type RequiredField } from '../App/frontend/utils/reveal-required-field';

let clock = 0, top = -600, nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  clock = 0; top = -600; nextFrame = 0; frames.clear();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.stubGlobal('window', { innerHeight: 800, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function field() {
  return { value: '', isConnected: true, scrollIntoView: vi.fn(), focus: vi.fn(), getBoundingClientRect: () => ({ top, bottom: top + 40 }) } as unknown as RequiredField;
}
function advance(position: number, count = 1) {
  for (let step = 0; step < count; step++) {
    top = position; clock += 20;
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) callback(clock);
  }
}
describe('shared required-field reveal', () => {
  it('waits for smooth scrolling to stop before focusing without another jump', async () => {
    const input = field(), controller = new AbortController();
    const ready = revealRequiredField(input, controller.signal);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    advance(-300); advance(-100); advance(100); advance(300);
    expect(input.focus).not.toHaveBeenCalled();
    advance(300, 10);
    expect(await ready).toBe(true);
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
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
    input.value = 'Already filled'; advance(300, 14);
    expect(await ready).toBe(false);
    expect(input.focus).not.toHaveBeenCalled();
  });
  it('respects reduced motion while keeping focus from scrolling again', async () => {
    vi.stubGlobal('window', { innerHeight: 800, matchMedia: () => ({ matches: true }) });
    const input = field();
    expect(await revealRequiredField(input, new AbortController().signal)).toBe(true);
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'instant' });
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
