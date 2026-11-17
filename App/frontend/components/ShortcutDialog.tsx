import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  X,
} from 'lucide-react';
import PopupSurface from './PopupSurface';
import { useLanguage } from './LanguageSelector';
import {
  detectShortcutDevice,
  shortcutCopy,
  shortcutDevices,
  shortcutPageURL,
  type ShortcutDevice,
} from '../utils/shortcut-instructions';
import './shortcut-dialog.css';

export default function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const copy = shortcutCopy[useLanguage()];
  const id = useId();
  const surface = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState(() =>
    detectShortcutDevice(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const pageLink = shortcutPageURL(window.location.href);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    surface.current
      ?.querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') {
        return;
      }
      const controls = surface.current?.querySelectorAll<HTMLElement>(
        'button, select, input',
      );
      if (!controls?.length) {
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageLink);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return createPortal(
    <div className="modal-backdrop shortcut-backdrop" onClick={onClose}>
      <PopupSurface
        ref={surface}
        className="shortcut-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-intro`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button modal-close"
          aria-label={copy.close}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 id={`${id}-title`}>{copy.title}</h2>
        <p id={`${id}-intro`}>{copy.intro}</p>
        <label className="shortcut-device" htmlFor={`${id}-device`}>
          {copy.device}
        </label>
        <select
          id={`${id}-device`}
          value={device}
          onChange={(event) => setDevice(event.target.value as ShortcutDevice)}
        >
          {shortcutDevices.map((value) => (
            <option key={value} value={value}>
              {copy.devices[value]}
            </option>
          ))}
        </select>
        <ol className="shortcut-steps">
          {copy.steps[device].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <label className="shortcut-link-label" htmlFor={`${id}-link`}>
          {copy.link}
        </label>
        <input
          id={`${id}-link`}
          readOnly
          value={pageLink}
          onFocus={(event) => event.target.select()}
        />
        <button
          type="button"
          className="button primary shortcut-copy"
          onClick={() => void copyLink()}
        >
          {copyStatus === 'copied' ? <Check size={17} /> : <Copy size={17} />}
          {copyStatus === 'copied' ? copy.copied : copy.copy}
        </button>
        <span className="shortcut-status" role="status">
          {copyStatus === 'failed'
            ? copy.copyFailed
            : copyStatus === 'copied'
              ? copy.copied
              : ''}
        </span>
      </PopupSurface>
    </div>,
    document.body,
  );
}
