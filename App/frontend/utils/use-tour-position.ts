/** Measures and reveals guide targets without owning guide progression. */
import {
  useLayoutEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  tourCopy,
  tourSteps,
} from './event-tour';
import { tourScrollDelta } from './tour-position';

/** Viewport bounds of the highlighted control and the guide card beside it. */
export type TourPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  cardX: number;
  cardY: number;
};

/** Inputs shared by guide measurement, scrolling, and their cleanup. */
type TourPositionOptions = {
  step: number | null;
  definition: (typeof tourSteps)[number] | null;
  copy: (typeof tourCopy)[keyof typeof tourCopy];
  panel: RefObject<HTMLDivElement | null>;
  motion: RefObject<boolean>;
  setMoving: Dispatch<SetStateAction<boolean>>;
  setPosition: Dispatch<SetStateAction<TourPosition | null>>;
};

/**
 * Positioning hook for an open guide. Reveals its target before measuring the
 * highlight and card, then tracks scrolling, resizing, and content changes.
 * Closing or changing steps cancels pending frames and removes old listeners.
 * The caller retains refs so closing the guide can also stop an active scroll.
 */
export function useTourPosition({
  step,
  definition,
  copy,
  panel,
  motion,
  setMoving,
  setPosition,
}: TourPositionOptions) {
  /**
   * Reveal and measure the guide's current target as its layout changes.
   * @returns Cleanup that cancels scrolling, measurements, and layout
   * listeners, or nothing while the guide is closed.
   */
  useLayoutEffect(() => {
    if (step === null) {
      return;
    }
    const target = definition
      ? document.querySelector<HTMLElement>(definition.target)
      : null;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    /**
     * Scroll the target into the visible viewport while respecting reduced
     * motion.
     * @returns Whether a scroll was requested; false when no target or movement is needed.
     */
    const revealTarget = () => {
      if (!target) {
        return false;
      }
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? innerWidth;
      const vh = viewport?.height ?? innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      const card = panel.current?.getBoundingClientRect();
      const width = card?.width ?? 350;
      const height = card?.height ?? 260;
      const rect = target.getBoundingClientRect();
      const reserveCard =
        vw < 700 ||
        (rect.right + width + 16 > left + vw - 16 &&
          rect.left - width - 16 < left + 16);
      const delta = tourScrollDelta(rect, {
        top: top + 20,
        bottom: top + vh - (reserveCard ? height + 28 : 20),
      });
      if (Math.abs(delta) <= 1) {
        return false;
      }
      window.scrollBy({
        top: delta,
        behavior: reducedMotion ? 'instant' : 'smooth',
      });
      return true;
    };

    const content = panel.current?.querySelector<HTMLElement>(
      '.event-tour-content',
    );
    if (content) {
      content.scrollTop = 0;
    }
    panel.current?.focus({ preventScroll: true });
    let frame = 0;
    let settleFrame = 0;

    /** Place the highlight and guide card within the current viewport. */
    const measure = () => {
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? innerWidth;
      const vh = viewport?.height ?? innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      const card = panel.current?.getBoundingClientRect();
      const width = card?.width ?? 340;
      const height = card?.height ?? 260;
      let cardX = left + (vw - width) / 2;
      let cardY = top + (vh - height) / 2;
      const rect = target?.getBoundingClientRect();
      let x = 0;
      let y = 0;
      let w = 0;
      let h = 0;
      if (rect && rect.width && rect.height) {
        const fitsRight = rect.right + 16 + width <= left + vw - 16;
        const fitsLeft = rect.left - 16 - width >= left + 16;
        const stacked = vw < 700 || (!fitsRight && !fitsLeft);
        if (stacked) {
          cardX = vw < 700 ? left + 12 : left + (vw - width) / 2;
          cardY = top + vh - height - 12;
          // At the end of the page scrolling may stop before the target clears the card.
          if (rect.bottom + 6 > cardY - 12 && rect.top >= top + height + 28) {
            cardY = top + 12;
          }
        } else {
          cardX = fitsRight ? rect.right + 16 : rect.left - 16 - width;
          cardY = Math.max(
            top + 16,
            Math.min(top + vh - height - 16, rect.top),
          );
        }
        x = Math.max(left + 8, rect.left - 6);
        y = Math.max(top + 8, rect.top - 6);
        const cardBelowTarget = stacked && cardY >= rect.top;
        const bottom = Math.min(
          rect.bottom + 6,
          cardBelowTarget ? cardY - 12 : top + vh - 8,
        );
        w = Math.max(0, Math.min(rect.right + 6, left + vw - 8) - x);
        h = Math.max(0, bottom - y);
      }
      const next = {
        x,
        y,
        width: w,
        height: h,
        cardX,
        cardY,
      };
      setPosition(
        /* Avoid rerendering when the measured guide position has not changed. */
        (previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };

    /** Coalesce repeated layout events into one animation-frame measurement. */
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    /** Reveal the next guide target and wait for its scrolling to settle. */
    const reveal = () => {
      cancelAnimationFrame(settleFrame);
      motion.current = true;
      setMoving(true);
      const scrolled = revealTarget();
      measure();
      if (reducedMotion) {
        motion.current = false;
        setMoving(false);
        return;
      }
      const started = performance.now();
      let previousY = window.scrollY;
      let stableFrames = 0;

      /**
       * Finish the moving state once scrolling stabilizes or its deadline is
       * reached.
       */
      const settle = (time: number) => {
        stableFrames =
          Math.abs(window.scrollY - previousY) < 0.5 ? stableFrames + 1 : 0;
        previousY = window.scrollY;
        if (
          (!scrolled && time - started >= 150) ||
          (time - started >= 150 && stableFrames >= 4) ||
          time - started >= 1400
        ) {
          measure();
          motion.current = false;
          setMoving(false);
        } else {
          settleFrame = requestAnimationFrame(settle);
        }
      };

      settleFrame = requestAnimationFrame(settle);
    };

    reveal();
    const observer = new ResizeObserver(schedule);
    if (panel.current) {
      observer.observe(panel.current);
    }
    if (target) {
      observer.observe(target);
    }
    window.addEventListener('resize', reveal);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', reveal);
    window.visualViewport?.addEventListener('scroll', schedule);
    // Cancel guide measurements and scrolling, then remove layout listeners.
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      observer.disconnect();
      if (motion.current) {
        window.scrollTo({
          top: window.scrollY,
          behavior: 'instant',
        });
      }
      motion.current = false;
      window.removeEventListener('resize', reveal);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', reveal);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [
    step,
    definition,
    copy,
  ]);
}
