import {
  forwardRef,
  type HTMLAttributes,
} from 'react';
import './popup-surface.css';

/**
 * Reusable React surface component with shared popup styling and a forwarded ref.
 * @returns A styled div containing the supplied content and HTML attributes.
 * @example
 * ```tsx
 * <PopupSurface role="status">Changes saved.</PopupSurface>
 * ```
 */
const PopupSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  /**
   * Reusable popup surface component with shared styling and a forwarded DOM
   * reference.
   * @returns A styled div containing the supplied content and HTML attributes.
   */
  function PopupSurface({
    className = '',
    ...props
  }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={`popup-surface ${className}`.trim()}
      />
    );
  },
);

export default PopupSurface;
