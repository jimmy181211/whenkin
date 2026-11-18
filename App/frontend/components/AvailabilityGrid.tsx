/** Displays personal/group time slots and handles pointer selection. */
import type { AvailabilityCellContext } from './AvailabilityCell';
import AvailabilityGridTools from './AvailabilityGridTools';
import AvailabilityGridBody from './AvailabilityGridBody';
import { t } from '../i18n/index';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowDownUp } from 'lucide-react';
import {
  displayRange,
  gridModel,
  SLOT,
} from '../utils/time';
import type {
  MeetingEvent,
  TimeRange,
} from '../../shared/types';
import {
  clearsSelection,
  paintSelection,
} from '../utils/selection';
import { groupAvailability } from '../utils/group-availability';
import { scrollGrid } from '../utils/grid-scroll';
import type { SlotInspection } from './SlotDetails';
import { projectWeekly } from '../../shared/weekly';
import PopupSurface from './PopupSurface';

const MOBILE_BREAKPOINT_PX = 700;
// A displayed row spans 30 minutes; stored selections still use 15-minute slots.
const GRID_ROW_MINUTES = 30;
const MAX_UNDO_STEPS = 20;

/**
 * Calendar data, editing callbacks, and group-view controls supplied by
 * the page.
 */
type Props = {
  inspection?: SlotInspection | null;
  onInspect?: (value: SlotInspection | null) => void;
  event: MeetingEvent;
  zone: string;
  selected: Set<number>;
  onChange: (v: Set<number>) => void;
  highlights?: TimeRange[];
  canEdit?: boolean;
  onEditBlocked?: () => void;
  status?: ReactNode;
  view?: 'personal' | 'group';
  onViewChange?: (view: 'personal' | 'group') => void;
};
/**
 * Original selection and rectangle endpoints retained during one drag
 * gesture.
 */
type Gesture = {
  // Selection before this drag; every pointer move recalculates from this copy.
  base: Set<number>;
  row: number;
  col: number;
  endRow: number;
  endCol: number;
  // Fixed by the starting cell, so crossing selected cells does not flip the action.
  remove: boolean;
};

/**
 * Interactive calendar component for editing personal availability and
 * inspecting group results. Pointer and keyboard edits report a new slot set
 * to the parent; this component does not send requests or save responses
 * itself.
 * @param selected - Saved-coordinate slot starts, in milliseconds.
 * @param onChange - Receives the complete selection after an edit or undo.
 *
 * @returns The personal/group view controls and a paginated time grid with
 * selection, inspection, and shared-time highlights.
 */
export default function AvailabilityGrid({
  event,
  zone,
  selected,
  onChange,
  highlights = [],
  canEdit = true,
  onEditBlocked,
  status,
  view = 'personal',
  onViewChange,
  onInspect,
  inspection,
}: Props) {
  const weekly = event.schedule_mode === 'weekdays';
  // Levels 1-3 increase row height; they do not change stored slot duration.
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  /** Choose the initial calendar layout from the current screen width. */
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT_PX,
  );
  const group = view === 'group';
  // Personal view paints selections; group clicks inspect availability instead.
  const editing = canEdit && !group;
  // Weekly timestamps encode weekday/clock positions; UTC prevents a second shift.
  const clockZone = weekly ? 'UTC' : zone;
  const [selectionHint, setSelectionHint] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  /**
   * Weekly display slots may differ from storage slots; dated events need no
   * mapping.
   * @returns Weekly display-to-storage mappings, or null for a schedule with
   * specific dates.
   */
  const projection = useMemo(
    () => (weekly ? projectWeekly(event, zone) : null),
    [
      weekly,
      event.windows,
      event.timezone,
      event.created_at,
      zone,
    ],
  );

  /**
   * Map weekly display slots back to the organizer's saved coordinates.
   * @returns A stored slot start in milliseconds; dated-event stamps are unchanged.
   */
  const canonicalStamp = (stamp: number) =>
    projection ? projection.toCanonical(stamp) : stamp;

  /**
   * Build the displayed calendar rows and columns for the current zone.
   * @returns Local-date columns and clock rows for the current displayed
   * schedule.
   */
  const grid = useMemo(
    () =>
      gridModel(
        projection?.windows ?? event.windows,
        clockZone,
        GRID_ROW_MINUTES,
      ),
    [
      projection,
      event.windows,
      clockZone,
    ],
  );
  const scroll = useRef<HTMLDivElement>(null);
  /**
   * Number of available responders at each stored 15-minute slot start.
   * @returns A lookup from stored slot starts to available responder counts.
   */
  const counts = useMemo(
    () => groupAvailability(event.responses),
    [event.responses],
  );
  /**
   * Attach wheel handling that lets the surrounding page scroll at grid edges.
   * @returns Cleanup for the grid's wheel listener, or nothing if the scroll
   * element is absent.
   */
  useEffect(() => {
    const element = scroll.current;
    if (!element) {
      return;
    }

    /** Pass wheel input to the shared grid-scroll behavior. */
    const wheel = (event: WheelEvent) => scrollGrid(element, event);

    element.addEventListener('wheel', wheel, { passive: false });
    // Remove wheel handling when the calendar unmounts.
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  // Copies of earlier selections, independent of the currently displayed selection.
  const history = useRef<Set<number>[]>([]);
  // The pointer selection currently being dragged; null means no drag is active.
  const gesture = useRef<Gesture | null>(null);
  // Updating this count redraws undo controls; changing the history ref does not.
  const [undos, setUndos] = useState(0);
  /**
   * Find the underlying slots for a visible column/row without scanning on
   * every drag.
   * @returns One row-to-slot lookup per date column, preserving repeated
   * DST-hour rows.
   */
  const columnCellMaps = useMemo(
    () =>
      grid.days.map(
        /** Build a row lookup for each displayed date's slots. */
        ([, cells]) =>
          new Map(
            grid.rows.map(
              /* Pair each calendar row with its matching slots on this date. */
              (row) => [
                row.key,
                cells.filter(
                  /** Keep slots in this row's clock interval and repeated-hour occurrence. */
                  (c) =>
                    c.occurrence === row.occurrence &&
                    c.minute >= row.minute &&
                    c.minute < row.minute + GRID_ROW_MINUTES,
                ),
              ],
            ),
          ),
      ),
    [grid],
  );
  /**
   * Track screen-width changes that affect the number of visible days.
   * @returns Cleanup that removes the screen-width listener.
   */
  useEffect(() => {
    /** Update the narrow-screen layout flag after resizing. */
    const resize = () =>
      setIsNarrowScreen(window.innerWidth < MOBILE_BREAKPOINT_PX);

    window.addEventListener('resize', resize);
    // Remove the screen-width listener when the grid unmounts.
    return () => window.removeEventListener('resize', resize);
  }, []);
  /**
   * End an old drag and return to the first day page when the view or zone
   * changes.
   */
  useEffect(() => {
    gesture.current = null;
    setSelectionHint(null);
    setPage(0);
  }, [
    zone,
    view,
  ]);
  const daysPerPage = isNarrowScreen ? 3 : 7;
  // Clamp the starting day when resizing changes how many columns fit on a page.
  const firstColumn = Math.min(
    page * daysPerPage,
    Math.max(0, grid.days.length - daysPerPage),
  );

  /** Store a copy of the selection before an edit, keeping bounded undo history. */
  function rememberSelection() {
    history.current = [
      ...history.current.slice(-(MAX_UNDO_STEPS - 1)),
      new Set(selected),
    ];
    setUndos(history.current.length);
  }

  /**
   * Rebuild the selection for the rectangle from the first cell to this cell.
   * Always start from the pre-drag selection so shrinking the rectangle restores
   * slots that are no longer inside it.
   * @param row - End row in the full grid.
   * @param col - End day column, including columns outside the current page.
   * @param x - Horizontal pointer position in viewport pixels, used for the hint.
   * @param y - Vertical pointer position in the same coordinate system.
   */
  function updateGestureSelection(
    row: number,
    col: number,
    x: number,
    y: number,
  ) {
    const currentGesture = gesture.current;
    if (!currentGesture || !editing) {
      return;
    }
    currentGesture.endRow = row;
    currentGesture.endCol = col;
    const stamps: number[] = [];
    for (
      let c = Math.min(currentGesture.col, col);
      c <= Math.max(currentGesture.col, col);
      c++
    ) {
      for (
        let r = Math.min(currentGesture.row, row);
        r <= Math.max(currentGesture.row, row);
        r++
      ) {
        const cells = columnCellMaps[c]?.get(grid.rows[r]?.key) || [];
        for (const cell of cells) {
          stamps.push(cell.stamp);
        }
      }
    }
    onChange(
      paintSelection(
        currentGesture.base,
        stamps.map(canonicalStamp),
        currentGesture.remove,
      ),
    );
    const first = Math.min(...stamps);
    const last = Math.max(...stamps);
    if (stamps.length) {
      const range = {
        start: new Date(first).toISOString(),
        end: new Date(last + SLOT).toISOString(),
      };
      setSelectionHint({
        text: `${t(currentGesture.remove ? 'Clear' : 'Available')} · ${displayRange(
          range,
          clockZone,
          weekly,
        )}`,
        x: Math.max(140, Math.min(window.innerWidth - 140, x)),
        y: Math.max(90, y - 70),
      });
    }
  }

  /**
   * Begin a primary-button drag on an editable time block.
   * Remember the original selection and whether this gesture adds or clears slots.
   * Capture the pointer so releasing outside the initial cell still ends the drag.
   */
  function beginSelection(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) {
      return;
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-stamp]',
    );
    if (!target) {
      return;
    }
    if (group) {
      return;
    }
    if (!canEdit) {
      onEditBlocked?.();
      return;
    }
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    rememberSelection();
    const cells = columnCellMaps[col]?.get(grid.rows[row]?.key) || [];
    gesture.current = {
      base: new Set(selected),
      row,
      col,
      endRow: row,
      endCol: col,
      remove: clearsSelection(
        cells.map(
          /* Choose the drag's add/remove action using the starting block's stored slots. */
          (c) => canonicalStamp(c.stamp),
        ),
        selected,
      ),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    updateGestureSelection(row, col, e.clientX, e.clientY);
  }

  /** Extend the current drag using the same add/remove action as its first cell. */
  function extendSelection(e: React.PointerEvent<HTMLDivElement>) {
    if (!gesture.current) {
      return;
    }
    e.preventDefault();
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-stamp]');
    if (target && e.currentTarget.contains(target)) {
      updateGestureSelection(
        Number(target.dataset.row),
        Number(target.dataset.col),
        e.clientX,
        e.clientY,
      );
    }
  }

  /** End the drag and hide its range hint. */
  function finishSelection() {
    gesture.current = null;
    setSelectionHint(null);
  }

  /** Restore the last selection through the normal change/autosave callback. */
  function undo() {
    if (!editing) {
      return;
    }
    const last = history.current.pop();
    if (last) {
      onChange(last);
      setUndos(history.current.length);
    }
  }

  const cellContext: AvailabilityCellContext = {
    event,
    zone,
    clockZone,
    weekly,
    group,
    selected,
    highlights,
    canEdit,
    onEditBlocked,
    onInspect,
    inspection,
    counts,
    canonicalStamp,
    onChange,
    rememberSelection,
  };

  return (
    <section
      className="availability-section"
      aria-label={t(group ? 'Group Availability' : 'Your availability grid')}
    >
      <AvailabilityGridTools
        view={view}
        onViewChange={onViewChange}
        status={status}
        editing={editing}
        undos={undos}
        onUndo={undo}
        zoom={zoom}
        onZoomChange={setZoom}
        paging={{
          page,
          firstColumn,
          daysPerPage,
          totalDays: grid.days.length,
          onPageChange: setPage,
        }}
        responderCount={event.responses.length}
      />
      <AvailabilityGridBody
        grid={grid}
        columnCellMaps={columnCellMaps}
        firstColumn={firstColumn}
        daysPerPage={daysPerPage}
        cellContext={cellContext}
        scroll={scroll}
        zoom={zoom}
        isNarrowScreen={isNarrowScreen}
        beginSelection={beginSelection}
        extendSelection={extendSelection}
        finishSelection={finishSelection}
      />
      {selectionHint && (
        <PopupSurface
          className="selection-guide"
          role="status"
          style={{
            left: selectionHint.x,
            top: selectionHint.y,
          }}
        >
          <ArrowDownUp size={15} />
          {selectionHint.text}
        </PopupSurface>
      )}
    </section>
  );
}
