/** Presents the guide trigger, spotlight, instructions, and navigation. */
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import {
  tourCopy,
  tourSteps,
} from '../utils/event-tour';
import type { TourPosition } from '../utils/use-tour-position';
import PopupSurface from './PopupSurface';

/** Display state and semantic actions; progression stays in EventTour. */
type EventTourViewProps = {
  step: number | null;
  position: TourPosition | null;
  moving: boolean;
  copy: (typeof tourCopy)[keyof typeof tourCopy];
  id: string;
  panel: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
  onStart: () => void;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
};

/**
 * Guide presentation component. The caller supplies measured viewport positions
 * and refs needed for focus management; this component does not install listeners.
 * @returns The help button and, while open, the guide overlay in a body portal.
 */
export default function EventTourView({
  step,
  position,
  moving,
  copy,
  id,
  panel,
  trigger,
  onStart,
  onSkip,
  onBack,
  onNext,
}: EventTourViewProps) {
  const active = step !== null;
  const welcome = step === -1;
  const definition = step !== null && step >= 0 ? tourSteps[step] : null;
  const content = definition ? copy[definition.key] : null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="header-control event-tour-trigger"
        onClick={
          /* Open the guide's welcome card from the help button. */
          onStart
        }
      >
        <CircleHelp size={16} aria-hidden="true" />
        {copy.guide}
      </button>
      {active &&
        createPortal(
          <div className="event-tour-layer" data-moving={moving}>
            <svg
              className="event-tour-shade"
              aria-hidden="true"
              width="100%"
              height="100%"
            >
              <defs>
                <mask id={id}>
                  <rect width="100%" height="100%" fill="white" />
                  {position && (
                    <rect
                      className="event-tour-cutout"
                      x={position.x}
                      y={position.y}
                      width={position.width}
                      height={position.height}
                      rx="12"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="#102e28"
                fillOpacity=".20"
                mask={`url(#${id})`}
              />
              {position && position.height > 0 && (
                <rect
                  className="event-tour-ring"
                  x={position.x}
                  y={position.y}
                  width={position.width}
                  height={position.height}
                  rx="12"
                  fill="none"
                  stroke="#238d80"
                  strokeWidth="2"
                />
              )}
            </svg>
            <PopupSurface
              ref={panel}
              className="event-tour-panel"
              data-welcome={welcome}
              role="dialog"
              aria-modal="true"
              aria-busy={moving}
              aria-labelledby={`${id}-title`}
              aria-describedby={`${id}-body`}
              tabIndex={-1}
              style={
                position
                  ? {
                    left: position.cardX,
                    top: position.cardY,
                  }
                  : undefined
              }
            >
              <div className="event-tour-content">
                {!welcome && (
                  <p className="event-tour-progress">
                    {copy.progress
                      .replace('{step}', String((step ?? 0) + 1))
                      .replace('{total}', String(tourSteps.length))}
                  </p>
                )}
                <h2 id={`${id}-title`}>
                  {welcome ? copy.welcome : content?.[0]}
                </h2>
                <p id={`${id}-body`}>{welcome ? copy.intro : content?.[1]}</p>
                {!welcome && !moving && position?.height === 0 && (
                  <p className="event-tour-unavailable">{copy.unavailable}</p>
                )}
              </div>
              <div className="event-tour-actions">
                <button
                  type="button"
                  className="text-button event-tour-skip"
                  onClick={
                    /* Close the guide and remember that it was skipped. */
                    onSkip
                  }
                >
                  {copy.skip}
                </button>
                <div>
                  {!welcome && (
                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={
                        /* Move to the preceding guide step. */
                        onBack
                      }
                    >
                      {copy.back}
                    </button>
                  )}
                  <button
                    type="button"
                    className="button primary compact"
                    onClick={
                      /* Advance the guide, or record completion after its final step. */
                      onNext
                    }
                  >
                    {welcome
                      ? copy.start
                      : step === tourSteps.length - 1
                        ? copy.done
                        : copy.next}
                  </button>
                </div>
              </div>
            </PopupSurface>
          </div>,
          document.body,
        )}
    </>
  );
}
