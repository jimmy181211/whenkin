/** Presents grid view, zoom, undo, day navigation, and heatmap controls. */
import { useLanguage } from '../i18n/LanguageProvider';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import GridDisplayOptions from './GridDisplayOptions';
import './availability-grid-tools.css';

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
  const { t } = useLanguage();
  const group = view === 'group';
  return (
    <>
      <div className="grid-tools">
        <div className="grid-edit-controls">
          <div
            className="segmented small availability-view-switch"
            role="group"
            aria-label={t('Availability View')}
          >
            <button
              type="button"
              aria-pressed={!group}
              onClick={
                /* Switch the calendar to personal availability editing. */
                () => onViewChange?.('personal')
              }
            >
              {t('Your Availability')}
            </button>
            <button
              type="button"
              aria-pressed={group}
              onClick={
                /* Switch the calendar to group availability inspection. */
                () => onViewChange?.('group')
              }
            >
              {t('Group Availability')}
            </button>
          </div>
        </div>
        <div className="grid-tool-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={t('Undo selection')}
            disabled={!editing || !undos}
            onClick={onUndo}
          >
            <Undo2 size={17} />
          </button>
          <GridDisplayOptions zoom={zoom} onZoomChange={onZoomChange} />
        </div>
        {paging.totalDays > paging.daysPerPage && (
          <div className="grid-pager">
            <div>
              <button
                className="icon-button"
                type="button"
                aria-label={t('Previous days')}
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
                aria-label={t('Next days')}
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
      </div>
      {group && (
        <div className="group-legend" aria-label={t('People Available')}>
          <span>0</span>
          <span className="group-legend-scale" aria-hidden="true" />
          <span>
            {responderCount} {t('Available')}
          </span>
        </div>
      )}
    </>
  );
}
