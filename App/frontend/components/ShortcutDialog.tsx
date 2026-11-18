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

/**
 * Shortcut-instruction dialog component with browser-specific steps and a
 * copyable page link.
 * @returns A dialog portal containing device selection, installation steps,
 * and copy feedback.
 */
export default function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const copy = shortcutCopy[useLanguage()];
  const id = useId();
  const surface = useRef<HTMLDivElement>(null);
  /** Choose initial instructions from browser and touchscreen information. */
  const [device, setDevice] = useState(() =>
    detectShortcutDevice(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const pageLink = shortcutPageURL(window.location.href);

  /**
   * Focus the shortcut dialog and prevent page scrolling until it closes.
   * @returns Cleanup that restores page scrolling and focus and removes dialog
   * keyboard handling.
   */
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    surface.current
      ?.querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true });

    /** Close with Escape and keep Tab navigation inside the shortcut dialog. */
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
    // Remove dialog keyboard handling and restore scrolling and prior focus.
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  /** Copy the current page link and display success or failure feedback. */
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
        onClick={
          /* Keep clicks inside the dialog from dismissing its backdrop. */
          (event) => event.stopPropagation()
        }
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
          onChange={
            /* Switch the manual instructions to the chosen browser or device. */
            (event) => setDevice(event.target.value as ShortcutDevice)
          }
        >
          {shortcutDevices.map(
            /**
             * @returns One browser/device category in the instruction
             * selector.
             */
            (value) => (
              <option key={value} value={value}>
                {copy.devices[value]}
              </option>
            ),
          )}
        </select>
        <ol className="shortcut-steps">
          {copy.steps[device].map(
            /**
             * @returns One instruction step for the selected device.
             */
            (step) => (
              <li key={step}>{step}</li>
            ),
          )}
        </ol>
        <label className="shortcut-link-label" htmlFor={`${id}-link`}>
          {copy.link}
        </label>
        <input
          id={`${id}-link`}
          readOnly
          value={pageLink}
          onFocus={
            /* Select the page URL so it can also be copied manually. */
            (event) => event.target.select()
          }
        />
        <button
          type="button"
          className="button primary shortcut-copy"
          onClick={
            /* Start copying the shortcut link from the copy button. */
            () => void copyLink()
          }
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
