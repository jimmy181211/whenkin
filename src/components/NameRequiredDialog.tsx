import { useEffect, useRef } from 'react';
import { t } from '../lib/i18n';

export default function NameRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open) dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} className="leave-dialog name-required-dialog" aria-labelledby="name-required-title" onCancel={onClose} onClose={onClose}>
    <h2 id="name-required-title">{t('Enter your name before editing availability.')}</h2>
    <div className="dialog-actions"><button autoFocus type="button" className="button primary" onClick={onClose}>{t('Enter Your Name')}</button></div>
  </dialog>;
}
