import { useLanguage } from '../i18n/LanguageProvider';
import { useId, useState } from 'react';
import { X } from 'lucide-react';
import ModalSurface from './ModalSurface';
import CopyLinkControl from './CopyLinkControl';
import {
  detectShortcutDevice,
  shortcutCopy,
  shortcutDevices,
  shortcutTutorials,
  shortcutPageURL,
  type ShortcutDevice,
} from '../utils/shortcut-instructions';
import './shortcut-dialog.css';

/**
 * Shortcut-help dialog component with official browser tutorials and a
 * copyable page link.
 * @returns A native dialog containing device selection, an official tutorial,
 * and copy feedback.
 */
export default function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage();
  const copy = shortcutCopy[language];
  const id = useId();
  /** Choose initial instructions from browser and touchscreen information. */
  const [device, setDevice] = useState(() =>
    detectShortcutDevice(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const pageLink = shortcutPageURL(window.location.href);

  /** Copy the current page link and display success or failure feedback. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageLink);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <ModalSurface className="shortcut-dialog" labelledBy={`${id}-title`} onClose={onClose}>
      <button
        type="button"
        className="icon-button modal-close"
        aria-label={copy.close}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <h2 id={`${id}-title`}>{copy.title}</h2>
      <label className="shortcut-device" htmlFor={`${id}-device`}>
        {copy.device}
      </label>
      <select
        id={`${id}-device`}
        value={device}
        onChange={
          /* Show the official tutorial for the chosen browser or device. */
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
      <div className="shortcut-tutorial">
        <a
          className="button secondary"
          href={shortcutTutorials[device]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.tutorial}
        </a>
      </div>
      <label className="shortcut-link-label" htmlFor={`${id}-link`}>
        {copy.link}
      </label>
      <CopyLinkControl
        id={`${id}-link`}
        value={pageLink}
        copied={copyStatus === 'copied'}
        copyLabel={copy.copy}
        copiedLabel={copy.copied}
        buttonClassName="shortcut-copy"
        onCopy={copyLink}
      />
      <span className="shortcut-status" role="status">
        {copyStatus === 'failed' ? copy.copyFailed : copyStatus === 'copied' ? copy.copied : ''}
      </span>
    </ModalSurface>
  );
}
