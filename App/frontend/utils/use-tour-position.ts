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
import {
  guidePosition,
  tourScrollDelta,
} from './tour-position';
import { visibleViewport } from './anchored-panel-position';

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

/** Observe one guide step and release frames and listeners when that step ends. */
function observeGuidePosition({
  step,
  definition,
  panel,
  motion,
  setMoving,
  setPosition,
}: TourPositionOptions) {
  if (step === null) {
    return;
  }
  const target = definition ? document.querySelector<HTMLElement>(definition.target) : null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Scroll the target into the visible viewport while respecting reduced
   * motion.
   * @returns Whether a scroll was requested; false when no target or movement is needed.
   */
  const revealTarget = () => {
    if (!target) {
      return false;
    }
    const {
      width: vw,
      height: vh,
      top,
      left,
    } = visibleViewport();
    const card = panel.current?.getBoundingClientRect();
    const width = card?.width ?? 350;
    const height = card?.height ?? 260;
    const rect = target.getBoundingClientRect();
    const reserveCard =
      vw < 700 || (rect.right + width + 16 > left + vw - 16 && rect.left - width - 16 < left + 16);
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

  const content = panel.current?.querySelector<HTMLElement>('.event-tour-content');
  if (content) {
    content.scrollTop = 0;
  }
  panel.current?.focus({ preventScroll: true });
  let frame = 0;
  let settleFrame = 0;

  /** Place the highlight and guide card within the current viewport. */
  const measure = () => {
    const {
      width: vw,
      height: vh,
      top,
      left,
    } = visibleViewport();
    const card = panel.current?.getBoundingClientRect();
    const width = card?.width ?? 340;
    const height = card?.height ?? 260;
    const next = guidePosition({
      vw,
      vh,
      top,
      left,
      width,
      height,
      rect: target?.getBoundingClientRect(),
    });
    setPosition(
      /* Avoid rerendering when the measured guide position has not changed. */
      (previous) =>
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height &&
        previous.cardX === next.cardX &&
        previous.cardY === next.cardY
          ? previous
          : next,
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
      stableFrames = Math.abs(window.scrollY - previousY) < 0.5 ? stableFrames + 1 : 0;
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
}

/**
 * Positioning hook for an open guide. Reveals its target before measuring the
 * highlight and card, then tracks scrolling, resizing, and content changes.
 * Closing or changing steps cancels pending frames and removes old listeners.
 * The caller retains refs so closing the guide can also stop an active scroll.
 */
export function useTourPosition(options: TourPositionOptions) {
  /**
   * Reveal and measure the guide's current target as its layout changes.
   * @returns Cleanup that cancels scrolling, measurements, and layout
   * listeners, or nothing while the guide is closed.
   */
  useLayoutEffect(
    /** Start this step's layout work; React cleans it up before starting the next step. */
    () => observeGuidePosition(options),
    [
      options.step,
      options.definition,
      options.copy,
    ],
  );
}
