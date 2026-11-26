/** Measures guide targets and keeps the instruction card inside the visible viewport. */
import { useLayoutEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { tourCopy, tourSteps } from './event-tour';
import { guidePosition, tourScrollDelta } from './tour-position';
import { visibleViewport } from './anchored-panel-position';
import { observeOverlayLayout } from './observe-overlay-layout';

/** Highlight bounds and instruction-card coordinates, in viewport pixels. */
export type TourPosition = ReturnType<typeof guidePosition>;

/** Current step, rendered card and the state receiving its measured position. */
type TourPositionOptions = {
  step: number | null;
  definition: (typeof tourSteps)[number] | null;
  copy: (typeof tourCopy)[keyof typeof tourCopy];
  panel: RefObject<HTMLDivElement | null>;
  setPosition: Dispatch<SetStateAction<TourPosition | null>>;
};

/** Reveal each step immediately, then track layout changes using the shared overlay helper. */
export function useTourPosition({
  step,
  definition,
  copy,
  panel,
  setPosition,
}: TourPositionOptions) {
  /** Measure the open step; return cleanup for its layout subscriptions. */
  useLayoutEffect(() => {
    if (step === null) {
      return;
    }
    const target = definition ? document.querySelector<HTMLElement>(definition.target) : null;

    /** Reserve card space on narrow screens, then position both card and highlight. */
    const place = () => {
      const { width: vw, height: vh, top, left } = visibleViewport();
      const card = panel.current?.getBoundingClientRect();
      const width = card?.width ?? 350;
      const height = card?.height ?? 260;
      setPosition(
        guidePosition({ vw, vh, top, left, width, height, rect: target?.getBoundingClientRect() }),
      );
    };

    if (target) {
      const { width: vw, height: vh, top, left } = visibleViewport();
      const card = panel.current?.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const reserveCard =
        vw < 700 ||
        (rect.right + (card?.width ?? 350) + 16 > left + vw - 16 &&
          rect.left - (card?.width ?? 350) - 16 < left + 16);
      const delta = tourScrollDelta(rect, {
        top: top + 20,
        bottom: top + vh - (reserveCard ? (card?.height ?? 260) + 28 : 20),
      });
      window.scrollBy({ top: delta, behavior: 'instant' });
    }
    const content = panel.current?.querySelector('.event-tour-content');
    if (content) {
      content.scrollTop = 0;
    }
    panel.current?.focus({ preventScroll: true });
    return observeOverlayLayout(place, [panel.current, target]);
  }, [step, definition, copy, panel, setPosition]);
}
