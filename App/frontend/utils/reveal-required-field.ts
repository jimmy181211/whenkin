export type RequiredField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Scroll first, then focus without causing a second browser jump. */
export async function revealRequiredField(field: RequiredField, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted || !field.isConnected || field.value.trim()) return false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
  const arrived = reducedMotion || await new Promise<boolean>(resolve => {
    let frame = 0, stableFrames = 0;
    let previousTop = field.getBoundingClientRect().top;
    const started = performance.now();
    const finish = (result: boolean) => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = () => finish(false);
    const measure = (time: number) => {
      if (signal.aborted || !field.isConnected) return finish(false);
      const rect = field.getBoundingClientRect();
      stableFrames = Math.abs(rect.top - previousTop) < .5 ? stableFrames + 1 : 0;
      previousTop = rect.top;
      if (time - started >= 200 && stableFrames >= 4) {
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight);
        return finish(rect.top >= top && rect.bottom <= bottom);
      }
      if (time - started >= 2400) return finish(false);
      frame = requestAnimationFrame(measure);
    };
    signal.addEventListener('abort', abort, { once: true });
    frame = requestAnimationFrame(measure);
  });
  if (!arrived || signal.aborted || !field.isConnected || field.value.trim()) return false;
  field.focus({ preventScroll: true });
  return true;
}
