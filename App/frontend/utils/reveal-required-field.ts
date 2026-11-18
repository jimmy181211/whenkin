/**
 * Form controls that can be scrolled into view and focused for a
 * required-field reminder.
 */
export type RequiredField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
export const REQUIRED_FIELD_SCROLL_MS = 650;

/** A planned scroll's original offset, destination, and movement callback. */
type ScrollTarget = { from: number;
  to: number;
  move: (top: number) => void };

/**
 * Plan inner-container moves first, then the page move needed to center the field.
 * @returns Ordered scroll instructions; an empty list means no movement is needed.
 */
function scrollTargets(field: RequiredField) {
  const rect = field.getBoundingClientRect();
  const targets: ScrollTarget[] = [];
  // Expected screen position after each planned inner scroll, without moving yet.
  let fieldTop = rect.top;

  /**
   * Clamp a planned scroll, retain meaningful movement, and return its
   * distance.
   * @returns The signed movement in pixels used to predict the field's next position.
   */
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
      /** Apply one animation step to the containing scroll panel. */
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
    /** Apply the corresponding animation step to the page scroll. */
    (top) =>
      window.scrollTo({
        top,
        behavior: 'instant',
      }),
  );
  return targets;
}

/**
 * Reveal an empty required field, then focus it without a second browser jump.
 * Respect reduced motion and stop when the user interrupts or fills the field.
 * @param signal - Cancels an older reminder when a new one is requested.
 * @returns Whether the field was reached and focused, so its reminder can appear.
 */
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
    (await new Promise<boolean>(
      /* Run the cancelable scroll animation and resolve whether the required field was reached. */
      (resolve) => {
        // Animation-frame handle used to cancel the next scheduled scroll step.
        let frame = 0;
        let pointerListener = false;
        const started = performance.now();
        const interruptions = [
          'wheel',
          'touchmove',
          'keydown',
          'resize',
        ] as const;

        /**
         * Remove reveal listeners and resolve whether the animation reached its
         * field.
         */
        const finish = (result: boolean) => {
          cancelAnimationFrame(frame);
          signal.removeEventListener('abort', abort);
          for (const type of interruptions) {
            window.removeEventListener(type, abort);
          }
          window.removeEventListener('pointerdown', abort, true);
          resolve(result);
        };

        /** Cancel the reveal without showing its reminder. */
        const abort = () => finish(false);

        /**
         * Advance the scroll animation unless the field was filled or the user
         * interrupted.
         */
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
          // Ease in and out while keeping the same duration for short and long moves.
          const eased =
            progress < 0.5
              ? 4 * progress ** 3
              : 1 - (-2 * progress + 2) ** 3 / 2;
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
      },
    ));
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
