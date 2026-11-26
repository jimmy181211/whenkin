/** Presents the guide trigger, spotlight, instructions, and navigation. */
import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { tourCopy, tourSteps } from '../utils/event-tour';
import type { TourPosition } from '../utils/use-tour-position';
import PopupSurface from './PopupSurface';

/** Display state and navigation actions supplied by EventTour. */
type EventTourViewProps = {
  step: number | null;
  position: TourPosition | null;
  copy: (typeof tourCopy)[keyof typeof tourCopy];
  panel: RefObject<HTMLDivElement | null>;
  onRestoreFocus?: () => void;
  onStart: () => void;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
};

/**
 * Show the guide in a native modal, with keyboard focus managed by the browser.
 * @returns The help button and, while open, a spotlight and instruction card.
 */
export default function EventTourView({
  step,
  position,
  copy,
  panel,
  onRestoreFocus,
  onStart,
  onSkip,
  onBack,
  onNext,
}: EventTourViewProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const active = step !== null;
  const welcome = step === -1;
  const content = step !== null && step >= 0 ? copy[tourSteps[step].key] : null;

  /** Open once per visit; native modal focus containment replaces custom Tab handling. */
  useLayoutEffect(() => {
    if (!active) {
      return;
    }
    const node = dialog.current!;
    node.showModal();
    /** Close the modal and restore the visible menu trigger if needed. */
    return () => {
      node.close();
      onRestoreFocus?.();
    };
  }, [active, onRestoreFocus]);

  return (
    <>
      <button type="button" className="header-control event-tour-trigger" onClick={onStart}>
        <CircleHelp size={16} aria-hidden="true" />
        {copy.guide}
      </button>
      {active &&
        createPortal(
          <dialog
            ref={dialog}
            className="event-tour-layer"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-body`}
            onCancel={
              /** Keep React state in sync when Escape requests closing. */
              (event) => {
                event.preventDefault();
                onSkip();
              }
            }
          >
            {position && position.height > 0 ? (
              <div
                className="event-tour-spotlight"
                aria-hidden="true"
                style={{
                  left: position.x,
                  top: position.y,
                  width: position.width,
                  height: position.height,
                }}
              />
            ) : (
              <div className="event-tour-shade" aria-hidden="true" />
            )}
            <PopupSurface
              ref={panel}
              className="event-tour-panel"
              data-welcome={welcome}
              tabIndex={-1}
              style={position ? { left: position.cardX, top: position.cardY } : undefined}
            >
              <div className="event-tour-content">
                {!welcome && (
                  <p className="event-tour-progress">
                    {copy.progress
                      .replace('{step}', String((step ?? 0) + 1))
                      .replace('{total}', String(tourSteps.length))}
                  </p>
                )}
                <h2 id={`${id}-title`}>{welcome ? copy.welcome : content?.[0]}</h2>
                <p id={`${id}-body`}>{welcome ? copy.intro : content?.[1]}</p>
                {!welcome && position?.height === 0 && (
                  <p className="event-tour-unavailable">{copy.unavailable}</p>
                )}
              </div>
              <div className="event-tour-actions">
                <button type="button" className="text-button event-tour-skip" onClick={onSkip}>
                  {copy.skip}
                </button>
                <div>
                  {!welcome && (
                    <button type="button" className="button secondary compact" onClick={onBack}>
                      {copy.back}
                    </button>
                  )}
                  <button type="button" className="button primary compact" onClick={onNext}>
                    {welcome ? copy.start : step === tourSteps.length - 1 ? copy.done : copy.next}
                  </button>
                </div>
              </div>
            </PopupSurface>
          </dialog>,
          document.body,
        )}
    </>
  );
}
