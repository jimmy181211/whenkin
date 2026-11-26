/** Walks visitors through the six event controls. */
import { useLanguage } from '../i18n/LanguageProvider';
import { useEffect, useRef, useState } from 'react';
import { tourService, tourCopy, tourSteps } from '../utils/event-tour';
import { useTourPosition, type TourPosition } from '../utils/use-tour-position';
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
}: { onOpen?: () => void; onRestoreFocus?: () => void } = {}) {
  const { language } = useLanguage();
  const copy = tourCopy[language];
  // Null closes the guide; -1 shows the welcome card; 0 onward indexes tourSteps.
  const [step, setStep] = useState<number | null>(null);
  const [position, setPosition] = useState<TourPosition | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const definition = step !== null && step >= 0 ? tourSteps[step] : null;

  /** Offer the welcome card when this browser has not dismissed the guide. */
  useEffect(() => {
    if (tourService.shouldOffer(tourService.browserStorage())) {
      setStep(-1);
    }
  }, []);

  /** Remember completion or skipping and close the guide. */
  function close(outcome: 'completed' | 'skipped') {
    tourService.finish(outcome, tourService.browserStorage());
    setStep(null);
    setPosition(null);
  }

  useTourPosition({ step, definition, copy, panel, setPosition });

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
      copy={copy}
      panel={panel}
      onRestoreFocus={onRestoreFocus}
      onStart={start}
      onSkip={skip}
      onBack={back}
      onNext={next}
    />
  );
}
