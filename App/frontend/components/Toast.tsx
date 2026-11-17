import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Info,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import PopupSurface from './PopupSurface';
import { t } from '../i18n/index';

type Props = {
  message: string;
  anchor: HTMLElement | null;
  onDismiss: () => void;
};

export default function Toast({
  message,
  anchor,
  onDismiss,
}: Props) {
  const notice = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({
    visibility: 'hidden',
  });
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  useLayoutEffect(() => {
    const place = () => {
      if (!notice.current) {
        return;
      }
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? innerWidth;
      const viewportHeight = viewport?.height ?? innerHeight;
      const box = notice.current.getBoundingClientRect();
      const target = anchor?.isConnected
        ? anchor.getBoundingClientRect()
        : {
          left: viewportLeft,
          width: viewportWidth,
          top: viewportTop + box.height + 22,
        };
      const center = target.left + target.width / 2;
      const left = Math.max(
        viewportLeft + 12,
        Math.min(
          center - box.width / 2,
          viewportLeft + viewportWidth - box.width - 12,
        ),
      );
      const top = Math.max(
        viewportTop + 8,
        Math.min(
          target.top - box.height - 10,
          viewportTop + viewportHeight - box.height - 8,
        ),
      );
      setPosition({
        top,
        left,
        '--notice-arrow': `${Math.max(
          16,
          Math.min(center - left, box.width - 16),
        )}px`,
      } as CSSProperties);
    };

    place();
    // Follow the control while the page or sharing panel scrolls.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    const resize = new ResizeObserver(place);
    if (notice.current) {
      resize.observe(notice.current);
    }
    if (anchor) {
      resize.observe(anchor);
    }
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      resize.disconnect();
    };
  }, [
    anchor,
    message,
  ]);

  const content = (
    <PopupSurface
      ref={notice}
      className="toast-notice"
      style={position}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Info size={19} aria-hidden="true" />
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
  return typeof document === 'undefined'
    ? content
    : createPortal(content, document.body);
}
