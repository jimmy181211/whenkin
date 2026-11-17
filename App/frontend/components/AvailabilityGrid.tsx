/** Displays personal/group time slots and handles pointer selection. */
import AvailabilityCell, {
  type AvailabilityCellContext,
} from './AvailabilityCell';
import {
  t,
  getLocale,
} from '../i18n/index';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Undo2,
} from 'lucide-react';
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
const GRID_ROW_MINUTES = 30;
const MAX_UNDO_STEPS = 20;

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
type Gesture = {
  base: Set<number>;
  row: number;
  col: number;
  endRow: number;
  endCol: number;
  remove: boolean;
};

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
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT_PX,
  );
  const group = view === 'group';
  const editing = canEdit && !group;
  const clockZone = weekly ? 'UTC' : zone;
  const [selectionHint, setSelectionHint] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
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

  const canonicalStamp = (stamp: number) =>
    projection ? projection.toCanonical(stamp) : stamp;

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
  const counts = useMemo(
    () => groupAvailability(event.responses),
    [event.responses],
  );
  useEffect(() => {
    const element = scroll.current;
    if (!element) {
      return;
    }

    const wheel = (event: WheelEvent) => scrollGrid(element, event);

    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const history = useRef<Set<number>[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const [undos, setUndos] = useState(0);
  const columnCellMaps = useMemo(
    () =>
      grid.days.map(
        ([, cells]) =>
          new Map(
            grid.rows.map((row) => [
              row.key,
              cells.filter(
                (c) =>
                  c.occurrence === row.occurrence &&
                  c.minute >= row.minute &&
                  c.minute < row.minute + GRID_ROW_MINUTES,
              ),
            ]),
          ),
      ),
    [grid],
  );
  useEffect(() => {
    const resize = () =>
      setIsNarrowScreen(window.innerWidth < MOBILE_BREAKPOINT_PX);

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    gesture.current = null;
    setSelectionHint(null);
    setPage(0);
  }, [
    zone,
    view,
  ]);
  const daysPerPage = isNarrowScreen ? 3 : 7;
  const firstColumn = Math.min(
    page * daysPerPage,
    Math.max(0, grid.days.length - daysPerPage),
  );
  const visibleDays = grid.days.slice(firstColumn, firstColumn + daysPerPage);

  function rememberSelection() {
    history.current = [
      ...history.current.slice(-(MAX_UNDO_STEPS - 1)),
      new Set(selected),
    ];
    setUndos(history.current.length);
  }

  /** Apply the same add/remove action across the dragged rectangle. */
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

  /** Capture the initial cell so dragging can continue outside its bounds. */
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
        cells.map((c) => canonicalStamp(c.stamp)),
        selected,
      ),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    updateGestureSelection(row, col, e.clientX, e.clientY);
  }

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

  function finishSelection() {
    gesture.current = null;
    setSelectionHint(null);
  }

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
              onClick={() => onViewChange?.('personal')}
            >
              {t('Your Availability')}
            </button>
            <button
              type="button"
              aria-pressed={group}
              onClick={() => onViewChange?.('group')}
            >
              {t('Group Availability')}
            </button>
          </div>
          {status}
        </div>
        <div className="grid-tool-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={t('Undo selection')}
            disabled={!editing || !undos}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Smaller time slots')}
            disabled={zoom <= 1}
            onClick={() => setZoom(zoom - 1)}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Larger time slots')}
            disabled={zoom >= 3}
            onClick={() => setZoom(zoom + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {grid.days.length > daysPerPage && (
        <div className="grid-pager">
          <div>
            <button
              className="icon-button"
              type="button"
              aria-label={t('Previous days')}
              disabled={page === 0}
              onClick={() => setPage(Math.max(0, page - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={t('Next days')}
              disabled={firstColumn + daysPerPage >= grid.days.length}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
      {group && (
        <div className="group-legend" aria-label={t('People Available')}>
          <span>0</span>
          <span className="group-legend-scale" aria-hidden="true" />
          <span>
            {event.responses.length} {t('Available')}
          </span>
        </div>
      )}
      <div
        ref={scroll}
        className={`time-grid-wrap ${group ? 'group-mode' : ''}`}
        style={
          {
            '--slot-height': `${(isNarrowScreen ? 26 : 32) + (zoom - 1) * 12}px`,
            '--days': visibleDays.length,
          } as React.CSSProperties
        }
      >
        <div
          className="time-grid"
          onPointerDown={beginSelection}
          onPointerMove={extendSelection}
          onPointerUp={finishSelection}
          onPointerCancel={finishSelection}
          onLostPointerCapture={finishSelection}
        >
          <div className="time-corner">
            {weekly ? t('Week') : zoneOffsetShort(zone, event.windows[0].start)}
          </div>
          {visibleDays.map(([date, cells]) => (
            <div className="day-heading" key={date}>
              {weekly ? (
                <strong>
                  {new Intl.DateTimeFormat(getLocale(), {
                    weekday: 'short',
                    timeZone: clockZone,
                  }).format(cells[0].stamp)}
                </strong>
              ) : (
                <>
                  <span>
                    {new Intl.DateTimeFormat(getLocale(), {
                      weekday: 'short',
                      timeZone: clockZone,
                    }).format(cells[0].stamp)}
                  </span>
                  <strong>
                    {new Intl.DateTimeFormat(getLocale(), {
                      month: 'short',
                      day: 'numeric',
                      timeZone: clockZone,
                    }).format(cells[0].stamp)}
                  </strong>
                </>
              )}
            </div>
          ))}
          {grid.rows.map((row, r) => (
            <GridRow key={row.key}>
              <div
                className={`time-label ${row.minute % 60 === 0 ? 'hour-label' : ''}`}
              >
                {row.minute % 60 === 0 ? (
                  <>
                    {clockLabel(row.minute)}
                    {row.occurrence > 0 && <small>{t('again')}</small>}
                  </>
                ) : zoom > 1 ? (
                  <small>:{String(row.minute % 60).padStart(2, '0')}</small>
                ) : null}
              </div>
              {visibleDays.map(([date], columnOffset) => {
                const columnIndex = firstColumn + columnOffset;
                return (
                  <AvailabilityCell
                    key={date}
                    cells={columnCellMaps[columnIndex].get(row.key) || []}
                    rowMinute={row.minute}
                    rowIndex={r}
                    columnIndex={columnIndex}
                    context={cellContext}
                  />
                );
              })}
            </GridRow>
          ))}
        </div>
      </div>
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

function GridRow({ children }: { children: React.ReactNode }) {
  return <div className="grid-row">{children}</div>;
}

function clockLabel(minute: number) {
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: 'UTC',
    hour: 'numeric',
  }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(minute / 60))));
}

function zoneOffsetShort(zone: string, at: string) {
  return (
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: zone,
      timeZoneName: 'short',
    })
      .formatToParts(new Date(at))
      .find((p) => p.type === 'timeZoneName')?.value || ''
  );
}
