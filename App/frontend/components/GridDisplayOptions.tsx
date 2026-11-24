/** Groups calendar row-height controls without changing the event's time slots. */
import { useId } from 'react';
import {
  Minus,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { langService } from '../i18n/language';
import { useDisclosure } from '../utils/use-disclosure';
import './grid-display-options.css';

/** Current row-height level and its parent-owned update action. */
type Props = {
  zoom: number;
  onZoomChange: (value: number) => void;
};

/**
 * Compact display-options component. Levels change row height only; they never
 * change stored slot duration or selection. Escape and outside clicks dismiss it.
 * @returns The options trigger and an expandable row-height control panel.
 */
export default function GridDisplayOptions({
  zoom,
  onZoomChange,
}: Props) {
  const disclosure = useDisclosure();
  const id = useId();
  return (
    <div className="grid-display-options" ref={disclosure.container}>
      <button
        type="button"
        className="icon-button"
        ref={disclosure.trigger}
        aria-label={langService.t('Display options')}
        title={langService.t('Display options')}
        aria-expanded={disclosure.open}
        aria-controls={id}
        onClick={disclosure.toggle}
      >
        <SlidersHorizontal size={18} />
      </button>
      {disclosure.open && (
        <div
          id={id}
          className="grid-display-panel"
          role="group"
          aria-label={langService.t('Row height')}
        >
          <span>{langService.t('Row height')}</span>
          <div>
            <button
              type="button"
              className="icon-button"
              aria-label={langService.t('Smaller time slots')}
              disabled={zoom <= 1}
              onClick={
                /* Reduce row height without changing time coordinates. */
                () => onZoomChange(zoom - 1)
              }
            >
              <Minus size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={langService.t('Larger time slots')}
              disabled={zoom >= 3}
              onClick={
                /* Increase row height without changing time coordinates. */
                () => onZoomChange(zoom + 1)
              }
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
