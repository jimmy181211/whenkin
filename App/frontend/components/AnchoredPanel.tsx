import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { anchoredPanelPosition } from '../utils/anchored-panel-position';
import PopupSurface from './PopupSurface';

/** Trigger, content, and close behavior for a small anchored popup. */
type Props = {
  anchor: HTMLElement;
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  focusOnOpen?: boolean;
};

/**
 * Reusable anchored popup component that stays within the visible viewport.
 * Reposition on scrolling/resizing and close on outside clicks or Escape.
 * @param focusOnOpen - Move focus into the panel and restore it when
 * appropriate.
 *
 * @returns A dialog portal beside the trigger, containing the supplied
 * children.
 */
export default function AnchoredPanel({
  anchor,
  label,
  onClose,
  children,
  className = '',
  focusOnOpen = false,
}: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // Event listeners use the latest close callback without being attached again.
  const close = useRef(onClose);
  close.current = onClose;
  const [position, setPosition] = useState<CSSProperties>({
    visibility: 'hidden',
  });
  /**
   * Measure the panel immediately and keep its position aligned with scrolling
   * and resizing.
   * @returns Cleanup that disconnects panel measurements and viewport
   * listeners.
   */
  useLayoutEffect(() => {
    /** Measure the current trigger and visible screen before placing the panel. */
    const place = () => {
      if (!anchor.isConnected || !panel.current) {
        close.current();
        return;
      }
      // The visible viewport can shrink or shift when a mobile keyboard opens.
      const vv = window.visualViewport;
      const viewport = {
        left: vv?.offsetLeft ?? 0,
        top: vv?.offsetTop ?? 0,
        width: vv?.width ?? innerWidth,
        height: vv?.height ?? innerHeight,
      };
      const box = panel.current.getBoundingClientRect();
      setPosition({
        ...anchoredPanelPosition(anchor.getBoundingClientRect(), box, viewport),
        maxHeight: Math.min(360, Math.max(80, viewport.height - 24)),
      });
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    const observer = new ResizeObserver(place);
    if (panel.current) {
      observer.observe(panel.current);
    }
    observer.observe(anchor);
    // Disconnect panel measurements and scroll/resize listeners when the anchor changes.
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      observer.disconnect();
    };
  }, [anchor]);
  /**
   * Handle focus, Escape, and outside clicks for the open panel.
   * @returns Cleanup that removes input listeners and restores focus when this
   * panel owned it.
   */
  useEffect(() => {
    const node = panel.current;
    // Focus target to restore when this panel was opened with focusOnOpen.
    const previous = document.activeElement;
    if (focusOnOpen) {
      node?.querySelector<HTMLElement>('[data-panel-autofocus]')?.focus({ preventScroll: true });
    }

    /** Close the panel when the user presses Escape. */
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
    };

    /** Close only when the pointer is outside both the panel and its trigger. */
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !node?.contains(e.target) && !anchor.contains(e.target)) {
        close.current();
      }
    };

    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside, true);
    // Remove input listeners and restore focus when this panel owned it.
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside, true);
      if (
        focusOnOpen &&
        node?.contains(document.activeElement) &&
        previous instanceof HTMLElement &&
        previous.isConnected
      ) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [
    anchor,
    focusOnOpen,
  ]);
  return createPortal(
    <PopupSurface
      ref={panel}
      className={'anchored-panel ' + className}
      style={position}
      role="dialog"
      aria-label={label}
      aria-modal="false"
    >
      {children}
    </PopupSurface>,
    document.body,
  );
}
