import {
  forwardRef,
  type HTMLAttributes,
} from 'react';
import './popup-surface.css';

/** Shared appearance for notices, popovers, dialogs and guide cards. */
const PopupSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
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
