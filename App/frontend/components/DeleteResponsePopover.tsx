import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import AnchoredPanel from './AnchoredPanel';

/**
 * Anchored confirmation component for deleting a saved response.
 * @returns The response name and cancel/delete controls; controls stay
 * disabled while confirmation runs.
 */
export default function DeleteResponsePopover({
  anchor,
  name,
  onConfirm,
  onClose,
}: {
  anchor: HTMLElement;
  name: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  /** Dismiss the confirmation only when deletion is not running. */
  const dismiss = () => {
    if (!busy) {
      onClose();
    }
  };

  /**
   * Run confirmation once and restore controls when it finishes.
   * A resolved callback closes the popup even if its value is false; a rejection
   * skips closing and propagates to the caller.
   */
  const confirm = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnchoredPanel
      anchor={anchor}
      label={t('Delete response?')}
      onClose={dismiss}
      focusOnOpen
      className="delete-response-popover"
    >
      <h2>{t('Delete response?')}</h2>
      <p>{t('Delete {name} and their availability?', { name })}</p>
      <div className="confirm-actions">
        <button
          type="button"
          data-panel-autofocus
          className="button secondary compact"
          disabled={busy}
          onClick={dismiss}
        >
          {t('Cancel')}
        </button>
        <button
          type="button"
          className="button danger compact"
          disabled={busy}
          onClick={
            /* Start the asynchronous confirmation action from the delete button. */
            () => void confirm()
          }
        >
          {t(busy ? 'Deleting…' : 'Delete')}
        </button>
      </div>
    </AnchoredPanel>
  );
}
