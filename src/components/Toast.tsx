import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Info, X } from 'lucide-react';
import { t } from '../lib/i18n';

type Props = { message: string; anchor: HTMLElement | null; onDismiss: () => void };
export default function Toast({ message, anchor, onDismiss }: Props) {
  const notice = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor?.isConnected || !notice.current) return;
      const target = anchor.getBoundingClientRect();
      const box = notice.current.getBoundingClientRect();
      const center = target.left + target.width / 2;
      const left = Math.max(12, Math.min(center - box.width / 2, window.innerWidth - box.width - 12));
      const top = Math.max(8, target.top - box.height - 10);
      setPosition({ top, left, '--notice-arrow': `${Math.max(16, Math.min(center - left, box.width - 16))}px` } as CSSProperties);
    };
    place();
    // Follow the control while the page or sharing panel scrolls.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    const resize = new ResizeObserver(place);
    if (notice.current) resize.observe(notice.current);
    if (anchor) resize.observe(anchor);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      resize.disconnect();
    };
  }, [anchor, message]);

  return <div ref={notice} className="toast-notice" style={position} role="status" aria-live="polite" aria-atomic="true">
    <Info size={19} aria-hidden="true"/>
    <span>{t(message)}</span>
    <button type="button" className="icon-button" aria-label={t('Dismiss notification')} onClick={onDismiss}><X size={16}/></button>
  </div>;
}
