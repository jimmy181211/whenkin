export type RequiredField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
export const REQUIRED_FIELD_SCROLL_MS = 650;

type ScrollTarget = { from: number;
  to: number;
  move: (top: number) => void };

function scrollTargets(field: RequiredField) {
  const rect = field.getBoundingClientRect();
  const targets: ScrollTarget[] = [];
  let fieldTop = rect.top;

  const add = (
    from: number,
    desired: number,
    maximum: number,
    move: ScrollTarget['move'],
  ) => {
    const to = Math.max(0, Math.min(desired, Math.max(0, maximum)));
    if (Math.abs(to - from) > 0.5) {
      targets.push({
        from,
        to,
        move,
      });
    }
    return to - from;
  };

  const root = document.scrollingElement ?? document.documentElement;
  for (
    let parent = field.parentElement;
    parent && parent !== root && parent !== document.body;
    parent = parent.parentElement
  ) {
    if (
      parent.scrollHeight <= parent.clientHeight ||
      !/auto|scroll/.test(getComputedStyle(parent).overflowY)
    ) {
      continue;
    }
    const container = parent;
    const center =
      container.getBoundingClientRect().top +
      container.clientTop +
      container.clientHeight / 2;
    fieldTop -= add(
      container.scrollTop,
      container.scrollTop + fieldTop + rect.height / 2 - center,
      container.scrollHeight - container.clientHeight,
      (top) =>
        container.scrollTo({
          top,
          behavior: 'instant',
        }),
    );
  }
  const viewport = window.visualViewport;
  const center =
    (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) / 2;
  add(
    window.scrollY,
    window.scrollY + fieldTop + rect.height / 2 - center,
    root.scrollHeight - window.innerHeight,
    (top) =>
      window.scrollTo({
        top,
        behavior: 'instant',
      }),
  );
  return targets;
}

/** Scroll first, then focus without causing a second browser jump. */
export async function revealRequiredField(
  field: RequiredField,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted || !field.isConnected || field.value.trim()) {
    return false;
  }
  const targets = scrollTargets(field);
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (reducedMotion) {
    for (const target of targets) {
      target.move(target.to);
    }
  }
  const arrived =
    reducedMotion ||
    !targets.length ||
    (await new Promise<boolean>((resolve) => {
      let frame = 0;
      let pointerListener = false;
      const started = performance.now();
      const interruptions = [
        'wheel',
        'touchmove',
        'keydown',
        'resize',
      ] as const;

      const finish = (result: boolean) => {
        cancelAnimationFrame(frame);
        signal.removeEventListener('abort', abort);
        for (const type of interruptions) {
          window.removeEventListener(type, abort);
        }
        window.removeEventListener('pointerdown', abort, true);
        resolve(result);
      };

      const abort = () => finish(false);

      const animate = (time: number) => {
        if (signal.aborted || !field.isConnected || field.value.trim()) {
          return finish(false);
        }
        // Start listening after the pointer event which requested this reveal.
        if (!pointerListener) {
          window.addEventListener('pointerdown', abort, {
            capture: true,
            passive: true,
          });
          pointerListener = true;
        }
        const progress = Math.max(
          0,
          Math.min(1, (time - started) / REQUIRED_FIELD_SCROLL_MS),
        );
        const eased =
          progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        for (const target of targets) {
          target.move(target.from + (target.to - target.from) * eased);
        }
        if (progress === 1) {
          finish(true);
        } else {
          frame = requestAnimationFrame(animate);
        }
      };

      signal.addEventListener('abort', abort, { once: true });
      for (const type of interruptions) {
        window.addEventListener(type, abort, { passive: true });
      }
      frame = requestAnimationFrame(animate);
    }));
  if (!arrived || signal.aborted || !field.isConnected || field.value.trim()) {
    return false;
  }
  const rect = field.getBoundingClientRect();
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop ?? 0;
  const bottom = top + (viewport?.height ?? window.innerHeight);
  if (rect.top < top || rect.bottom > bottom) {
    return false;
  }
  field.focus({ preventScroll: true });
  return true;
}
