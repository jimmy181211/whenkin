/** Renders date headings and time blocks inside the grid's scrolling surface. */
import type {
  CSSProperties,
  PointerEventHandler,
  RefObject,
} from 'react';
import { langService } from '../i18n/language';
import {
  type GridCell,
  type gridModel,
} from '../utils/time';
import AvailabilityCell, { type AvailabilityCellContext } from './AvailabilityCell';

/** Prepared rows and slot mappings; interaction state stays in AvailabilityGrid. */
type AvailabilityGridBodyProps = {
  grid: ReturnType<typeof gridModel>;
  columnCellMaps: Map<string, GridCell[]>[];
  firstColumn: number;
  daysPerPage: number;
  cellContext: AvailabilityCellContext;
  scroll: RefObject<HTMLDivElement | null>;
  zoom: number;
  isNarrowScreen: boolean;
  beginSelection: PointerEventHandler<HTMLDivElement>;
  extendSelection: PointerEventHandler<HTMLDivElement>;
  finishSelection: () => void;
};

/**
 * Time-grid presentation component. Keeps the original scroll/pointer surfaces
 * and forwards their ref and events to the selection owner. DST repeats retain
 * separate rows and cells keep full-grid column indexes across day pages.
 * @returns The scrollable grid with date headings, clock labels, and time cells.
 */
export default function AvailabilityGridBody({
  grid,
  columnCellMaps,
  firstColumn,
  daysPerPage,
  cellContext,
  scroll,
  zoom,
  isNarrowScreen,
  beginSelection,
  extendSelection,
  finishSelection,
}: AvailabilityGridBodyProps) {
  const {
    event,
    zone,
    clockZone,
    weekly,
    group,
  } = cellContext;
  const visibleDays = grid.days.slice(firstColumn, firstColumn + daysPerPage);
  return (
    <div
      ref={scroll}
      className={`time-grid-wrap ${group ? 'group-mode' : ''}`}
      style={
        {
          '--slot-height': `${(isNarrowScreen ? 26 : 32) + (zoom - 1) * 12}px`,
          '--days': visibleDays.length,
        } as CSSProperties
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
          {weekly ? langService.t('Week') : zoneOffsetShort(zone, event.windows[0].start)}
        </div>
        {visibleDays.map(
          /**
           * @returns The weekday or calendar-date heading for this visible
           * column.
           */
          ([date, cells]) => (
            <div className="day-heading" key={date}>
              {weekly ? (
                <strong>
                  {new Intl.DateTimeFormat(langService.getLocale(), {
                    weekday: 'short',
                    timeZone: clockZone,
                  }).format(cells[0].stamp)}
                </strong>
              ) : (
                <>
                  <span>
                    {new Intl.DateTimeFormat(langService.getLocale(), {
                      weekday: 'short',
                      timeZone: clockZone,
                    }).format(cells[0].stamp)}
                  </span>
                  <strong>
                    {new Intl.DateTimeFormat(langService.getLocale(), {
                      month: 'short',
                      day: 'numeric',
                      timeZone: clockZone,
                    }).format(cells[0].stamp)}
                  </strong>
                </>
              )}
            </div>
          ),
        )}
        {grid.rows.map(
          /**
           * @returns One grid row containing its clock label and the visible
           * dates' time blocks.
           */
          (row, r) => (
            <GridRow key={row.key}>
              <div className={`time-label ${row.minute % 60 < 30 ? 'hour-label' : ''}`}>
                {row.minute % 60 < 30 ? (
                  <>
                    {clockLabel(row.minute)}
                    {row.occurrence > 0 && <small>{langService.t('again')}</small>}
                  </>
                ) : zoom > 1 ? (
                  <small>:{String(row.minute % 60).padStart(2, '0')}</small>
                ) : null}
              </div>
              {visibleDays.map(
                /**
                 * @returns The time block for this row and date, with the
                 * grid's shared interaction state.
                 */
                ([date], columnOffset) => {
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
                },
              )}
            </GridRow>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Layout component that aligns a clock label with its date cells.
 * @returns A grid-row container holding the supplied children.
 */
function GridRow({ children }: { children: React.ReactNode }) {
  return <div className="grid-row">{children}</div>;
}

/**
 * Format a row's clock label, including minutes for quarter-hour zone shifts.
 * @returns A localized hour, or hour/minute label when the row is not on the hour.
 */
function clockLabel(minute: number) {
  return new Intl.DateTimeFormat(langService.getLocale(), {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: minute % 60 ? '2-digit' : undefined,
  }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(minute / 60), minute % 60)));
}

/**
 * Read the displayed zone abbreviation at the event's reference instant.
 * @returns The zone abbreviation at the reference instant, or an empty string
 * if unavailable.
 */
function zoneOffsetShort(zone: string, at: string) {
  return (
    new Intl.DateTimeFormat(langService.getLocale(), {
      timeZone: zone,
      timeZoneName: 'short',
    })
      .formatToParts(new Date(at))
      .find(
        /* Extract the timezone-name part from the formatted date information. */
        (p) => p.type === 'timeZoneName',
      )?.value || ''
  );
}
