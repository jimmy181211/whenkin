/** Shared native modal shell; each caller supplies its content and closing action. */
import { useEffect, useRef, type ReactNode } from 'react';
import './popup-surface.css';
import './modal-surface.css';

/** Accessible naming and content for a mounted, open modal. */
type Props = {
  children: ReactNode;
  className?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  onClose: () => void;
};

/**
 * Native modal component with the shared popup appearance and background scroll lock.
 * Mount it only while open. The browser contains keyboard focus; unmounting restores
 * scrolling and the previous focus. Escape and backdrop clicks request closing.
 * @returns A dialog containing the caller's controls, opened after React mounts it.
 */
export default function ModalSurface({
  children,
  className = '',
  label,
  labelledBy,
  describedBy,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  /** Open once; content rerenders must not reset focus or reopen the dialog. */
  useEffect(() => {
    const node = dialog.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';

    /** Release the modal and restore the page state when its owner unmounts it. */
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`popup-surface modal-surface ${className}`.trim()}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={
        /** Let the React owner remove the dialog after an Escape close request. */
        (event) => {
          event.preventDefault();
          onClose();
        }
      }
      onClick={
        /** Backdrop clicks target the dialog; clicks inside its padding stay open. */
        (event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            onClose();
          }
        }
      }
    >
      {children}
    </dialog>
  );
}
