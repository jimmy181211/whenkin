/** Walks visitors through the six event controls. */
import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useLanguage } from './LanguageSelector';
import {
  browserTourStorage,
  finishTour,
  shouldOfferTour,
  tourCopy,
  tourSteps,
} from '../utils/event-tour';
import {
  useTourPosition,
  type TourPosition,
} from '../utils/use-tour-position';
import './event-tour.css';
import EventTourView from './EventTourView';

/**
 * Interactive guide component that introduces event controls while managing
 * focus and scrolling.
 * @returns The guide trigger and, while active, a portal with the highlighted
 * control and step instructions.
 */
export default function EventTour({
  onOpen,
  onRestoreFocus,
}: {
  onOpen?: () => void;
  onRestoreFocus?: () => void;
} = {}) {
  const copy = tourCopy[useLanguage()];
  // Null closes the guide; -1 shows the welcome card; 0 onward indexes tourSteps.
  const [step, setStep] = useState<number | null>(null);
  const [position, setPosition] = useState<TourPosition | null>(null);
  // UI state marks the guide busy while scrolling; motion also lets cleanup stop it.
  const [moving, setMoving] = useState(false);
  const motion = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const id = useId().replace(/:/g, '');
  const active = step !== null;
  const definition = step !== null && step >= 0 ? tourSteps[step] : null;

  /** Offer the welcome card when this browser has not dismissed the guide. */
  useEffect(() => {
    if (shouldOfferTour(browserTourStorage())) {
      setStep(-1);
    }
  }, []);

  /** Stop any guide scroll and remember completion/skipping for later visits. */
  function close(outcome: 'completed' | 'skipped') {
    if (motion.current) {
      window.scrollTo({
        top: window.scrollY,
        behavior: 'instant',
      });
    }
    motion.current = false;
    setMoving(false);
    finishTour(outcome, browserTourStorage());
    setStep(null);
    setPosition(null);
  }

  /**
   * Keep keyboard focus inside the active guide and remember its return
   * target.
   * @returns Cleanup that removes guide keyboard handling and restores focus,
   * or nothing while the guide is closed.
   */
  useEffect(() => {
    if (!active) {
      return;
    }
    lastFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    /** Handle Escape and wrap Tab navigation between guide controls. */
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('skipped');
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const controls = panel.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      );
      if (!controls?.length) {
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', keyboard, true);
    // Remove guide keyboard handling and restore the prior focus target.
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      (lastFocus.current?.isConnected
        ? lastFocus.current
        : trigger.current
      )?.focus({ preventScroll: true });
      // A collapsed header menu needs its visible trigger as the return target.
      onRestoreFocus?.();
    };
  }, [
    active,
    onRestoreFocus,
  ]);

  useTourPosition({
    step,
    definition,
    copy,
    panel,
    motion,
    setMoving,
    setPosition,
  });

  /** Open the welcome card without marking the guide complete. */
  const start = () => {
    onOpen?.();
    setStep(-1);
  };

  /** Record dismissal and restore the previously focused control. */
  const skip = () => close('skipped');

  /** Move to the preceding step, including the welcome card before step zero. */
  const back = () =>
    setStep(
      /* Read the current step when React applies this update. */
      (value) => (value ?? 0) - 1,
    );

  /** Advance one step, or record completion after the last step. */
  const next = () =>
    step === tourSteps.length - 1
      ? close('completed')
      : setStep(
        /* The welcome card is step -1, so its next step is zero. */
        (value) => (value ?? -1) + 1,
      );

  return (
    <EventTourView
      step={step}
      position={position}
      moving={moving}
      copy={copy}
      id={id}
      panel={panel}
      trigger={trigger}
      onStart={start}
      onSkip={skip}
      onBack={back}
      onNext={next}
    />
  );
}
