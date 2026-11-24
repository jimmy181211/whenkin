/** Presents grid view, zoom, undo, day navigation, and heatmap controls. */
import {
  ChevronLeft,
  ChevronRight,
  Undo2,
} from 'lucide-react';
import { langService } from '../i18n/language';
import GridDisplayOptions from './GridDisplayOptions';

/** Current date-page boundaries and the action that changes the page index. */
type GridPaging = {
  page: number;
  firstColumn: number;
  daysPerPage: number;
  totalDays: number;
  onPageChange: (page: number) => void;
};

/** Display controls supplied by the grid that owns selection and viewport state. */
type AvailabilityGridToolsProps = {
  view: 'personal' | 'group';
  onViewChange?: (view: 'personal' | 'group') => void;
  editing: boolean;
  undos: number;
  onUndo: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  paging: GridPaging;
  responderCount: number;
};

/**
 * Grid toolbar component. Requests changes through callbacks without owning
 * selection history or viewport state. Group view shows the responder-count scale.
 * @returns View/zoom/undo controls, optional date paging, and the group legend.
 */
export default function AvailabilityGridTools({
  view,
  onViewChange,
  editing,
  undos,
  onUndo,
  zoom,
  onZoomChange,
  paging,
  responderCount,
}: AvailabilityGridToolsProps) {
  const group = view === 'group';
  return (
    <>
      <div className="grid-tools">
        <div className="grid-edit-controls">
          <div
            className="segmented small availability-view-switch"
            role="group"
            aria-label={langService.t('Availability View')}
          >
            <button
              type="button"
              aria-pressed={!group}
              onClick={
                /* Switch the calendar to personal availability editing. */
                () => onViewChange?.('personal')
              }
            >
              {langService.t('Your Availability')}
            </button>
            <button
              type="button"
              aria-pressed={group}
              onClick={
                /* Switch the calendar to group availability inspection. */
                () => onViewChange?.('group')
              }
            >
              {langService.t('Group Availability')}
            </button>
          </div>
        </div>
        <div className="grid-tool-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={langService.t('Undo selection')}
            disabled={!editing || !undos}
            onClick={onUndo}
          >
            <Undo2 size={17} />
          </button>
          <GridDisplayOptions zoom={zoom} onZoomChange={onZoomChange} />
        </div>
      </div>
      {paging.totalDays > paging.daysPerPage && (
        <div className="grid-pager">
          <div>
            <button
              className="icon-button"
              type="button"
              aria-label={langService.t('Previous days')}
              disabled={paging.page === 0}
              onClick={
                /* Show the previous group of dates without moving before the first page. */
                () => paging.onPageChange(Math.max(0, paging.page - 1))
              }
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={langService.t('Next days')}
              disabled={paging.firstColumn + paging.daysPerPage >= paging.totalDays}
              onClick={
                /* Show the next group of calendar dates. */
                () => paging.onPageChange(paging.page + 1)
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
      {group && (
        <div className="group-legend" aria-label={langService.t('People Available')}>
          <span>0</span>
          <span className="group-legend-scale" aria-hidden="true" />
          <span>
            {responderCount} {langService.t('Available')}
          </span>
        </div>
      )}
    </>
  );
}
