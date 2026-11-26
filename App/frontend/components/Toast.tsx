import { useLanguage } from '../i18n/LanguageProvider';
import { observeOverlayLayout } from '../utils/observe-overlay-layout';
import { noticePosition, visibleViewport } from '../utils/anchored-panel-position';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import PopupSurface from './PopupSurface';

/** Text, anchor, and dismissal action for a temporary field reminder. */
type Props = { message: string; anchor: HTMLElement | null; onDismiss: () => void };

/**
 * Temporary field-reminder component positioned within the visible viewport.
 * @returns The reminder content inline without a document, or in a
 * document-body portal in the browser.
 */
export default function Toast({ message, anchor, onDismiss }: Props) {
  const { t } = useLanguage();
  const notice = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  /** Auto-dismiss after four seconds; cleanup cancels the timer. */
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    // Release the timer when the reminder changes or unmounts.
    return () => clearTimeout(timer);
  }, [onDismiss]);

  /** Follow anchor and viewport changes; return cleanup for layout tracking. */
  useLayoutEffect(() => {
    /** Measure and place the reminder without letting it extend beyond the viewport. */
    const place = () => {
      if (!notice.current) {
        return;
      }
      const viewport = visibleViewport();
      const box = notice.current.getBoundingClientRect();
      const target = anchor?.isConnected
        ? anchor.getBoundingClientRect()
        : { left: viewport.left, width: viewport.width, top: viewport.top + box.height + 22 };
      setPosition(noticePosition(target, box, viewport));
    };

    return observeOverlayLayout(place, [notice.current, anchor]);
  }, [anchor, message]);

  const content = (
    <PopupSurface
      ref={notice}
      className="toast-notice"
      style={position}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{t(message)}</span>
      <button
        type="button"
        className="icon-button"
        aria-label={t('Dismiss notification')}
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </PopupSurface>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
