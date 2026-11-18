import {
  useEffect,
  useRef,
} from 'react';
import AnchoredPanel from './AnchoredPanel';
import SlotDetails, { type SlotInspection } from './SlotDetails';
import { t } from '../i18n/index';
import type { MeetingEvent } from '../../shared/types';

/**
 * Group-availability popup component for the currently inspected time block.
 * @returns An anchored responder breakdown, or null when there is no anchor to
 * position it against.
 */
export default function AvailabilityPopover({
  event,
  zone,
  inspection,
  onClose,
}: {
  event: MeetingEvent;
  zone: string;
  inspection: SlotInspection;
  onClose: () => void;
}) {
  const close = useRef(onClose);
  close.current = onClose;
  /**
   * Watch pointer movement and window focus while group details are open.
   * @returns Cleanup for hover/focus listeners, or nothing if the inspected
   * block has no calendar container.
   */
  useEffect(() => {
    const calendar = inspection.anchor?.closest('.time-grid-wrap');
    if (!calendar) {
      return;
    }

    // Use calendar bounds so the portaled panel cannot interrupt hovering a cell.
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        return;
      }
      const rect = calendar.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX >= rect.right ||
        e.clientY < rect.top ||
        e.clientY >= rect.bottom
      ) {
        close.current();
      }
    };

    /** Close hover details when the pointer leaves the browser window. */
    const leaveWindow = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && e.relatedTarget === null) {
        close.current();
      }
    };

    /** Close availability details when the browser loses focus. */
    const blur = () => close.current();

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerout', leaveWindow);
    window.addEventListener('blur', blur);
    // Remove hover and focus listeners when the inspected block changes.
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leaveWindow);
      window.removeEventListener('blur', blur);
    };
  }, [inspection.anchor]);
  if (!inspection.anchor) {
    return null;
  }
  return (
    <AnchoredPanel
      anchor={inspection.anchor}
      label={t('Availability at This Time')}
      onClose={onClose}
      className="availability-popover"
    >
      <SlotDetails event={event} zone={zone} inspection={inspection} />
    </AnchoredPanel>
  );
}
