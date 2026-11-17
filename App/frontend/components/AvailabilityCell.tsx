/** Renders one time block, including selection, shared highlights, and inspection. */
import { t } from '../i18n/index';
import {
  SLOT,
  formatDay,
  formatTime,
  zoneLabel,
  type GridCell,
} from '../utils/time';
import { availabilityColor } from '../utils/group-availability';
import { paintSelection } from '../utils/selection';
import type {
  MeetingEvent,
  TimeRange,
} from '../../shared/types';
import type { SlotInspection } from './SlotDetails';

export type AvailabilityCellContext = {
  event: MeetingEvent;
  zone: string;
  clockZone: string;
  weekly: boolean;
  group: boolean;
  selected: Set<number>;
  highlights: TimeRange[];
  canEdit: boolean;
  onEditBlocked?: () => void;
  onInspect?: (value: SlotInspection | null) => void;
  inspection?: SlotInspection | null;
  counts: Map<number, number>;
  canonicalStamp: (stamp: number) => number;
  onChange: (selected: Set<number>) => void;
  rememberSelection: () => void;
};

type Props = {
  cells: GridCell[];
  rowMinute: number;
  rowIndex: number;
  columnIndex: number;
  context: AvailabilityCellContext;
};

export default function AvailabilityCell({
  cells,
  rowMinute,
  rowIndex,
  columnIndex,
  context,
}: Props) {
  const {
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
  } = context;
  const cell = cells[0];
  if (!cell) {
    return (
      <div
        className={`time-cell unavailable ${rowMinute % 60 === 0 ? 'hour-start' : ''}`}
        aria-hidden="true"
      />
    );
  }
  const blockEnd = cells.at(-1)!.stamp + SLOT;
  const selectedCells = cells.filter((c) =>
    selected.has(canonicalStamp(c.stamp)),
  );
  const active = selectedCells.length === cells.length;
  const partial = selectedCells.length > 0 && !active;
  const inspected =
    group &&
    inspection &&
    cells.some((c) => inspection.stamps.includes(canonicalStamp(c.stamp)));
  const highlightedCells = cells.map(
    (c) =>
      group &&
      highlights.some(
        (range) =>
          canonicalStamp(c.stamp) >= Date.parse(range.start) &&
          canonicalStamp(c.stamp) < Date.parse(range.end),
      ),
  );
  const highlighted = highlightedCells.some(Boolean);
  const fullyHighlighted = highlightedCells.every(Boolean);
  const cellCounts = cells.map((c) => counts.get(canonicalStamp(c.stamp)) ?? 0);
  const minimum = Math.min(...cellCounts);
  const maximum = Math.max(...cellCounts);
  const groupLabel = t('{count} of {total} available', {
    count: minimum === maximum ? minimum : `${minimum}–${maximum}`,
    total: event.responses.length,
  });
  const label = `${formatDay(
    cell.stamp,
    clockZone,
    false,
    weekly,
  )}, ${formatTime(cell.stamp, clockZone)}–${formatTime(
    blockEnd,
    clockZone,
  )}, ${weekly ? zoneLabel(zone) : 'UTC' + cell.offset}, ${group ? groupLabel : t(partial ? 'Partly available' : active ? 'Available' : 'not selected')}`;

  /** Share the same inspection range for hover, focus, and click. */
  function inspectSlot(anchor: HTMLButtonElement) {
    onInspect?.({
      anchor,
      stamps: cells.map((c) => canonicalStamp(c.stamp)),
      range: {
        start: new Date(cell.stamp).toISOString(),
        end: new Date(blockEnd).toISOString(),
      },
    });
  }

  const background = group
    ? `linear-gradient(to bottom, ${cellCounts
      .map(
        (count, index) =>
          `${availabilityColor(
            count,
            event.responses.length,
          )} ${(index * 100) / cells.length}% ${((index + 1) * 100) / cells.length}%`,
      )
      .join(', ')})`
    : undefined;
  return (
    <button
      type="button"
      aria-disabled={!group && !canEdit}
      aria-controls={group && inspected ? 'slot-details' : undefined}
      aria-expanded={group ? !!inspected : undefined}
      data-stamp={cell.stamp}
      data-row={rowIndex}
      data-col={columnIndex}
      aria-label={label}
      aria-pressed={group ? undefined : partial ? 'mixed' : active}
      className={`time-cell ${rowMinute % 60 === 0 ? 'hour-start' : ''} ${!group && active ? 'painted' : ''} ${!group && partial ? 'partial' : ''} ${highlighted ? 'highlighted' : ''} ${inspected ? 'inspected' : ''}`}
      style={
        group
          ? { background }
          : partial
            ? ({
              '--selection-half': selected.has(canonicalStamp(cell.stamp))
                ? 'bottom'
                : 'top',
            } as React.CSSProperties)
            : undefined
      }
      onPointerEnter={(e) => {
        if (group && e.pointerType !== 'touch') {
          inspectSlot(e.currentTarget);
        }
      }}
      onFocus={(e) => {
        if (group) {
          inspectSlot(e.currentTarget);
        }
      }}
      onClick={(e) => {
        if (group) {
          inspectSlot(e.currentTarget);
        } else if (!canEdit) {
          onEditBlocked?.();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') {
          return;
        }
        if (group) {
          return;
        }
        e.preventDefault();
        if (!canEdit) {
          onEditBlocked?.();
          return;
        }
        rememberSelection();
        onChange(
          paintSelection(
            selected,
            cells.map((c) => canonicalStamp(c.stamp)),
            selectedCells.length > 0,
          ),
        );
      }}
    >
      {highlightedCells.map((yes, index) =>
        yes && (!fullyHighlighted || index === 0) ? (
          <span
            key={index}
            aria-hidden="true"
            className="shared-highlight-slice"
            style={{
              top: fullyHighlighted ? '0%' : (index * 100) / cells.length + '%',
              height: fullyHighlighted ? '100%' : 100 / cells.length + '%',
            }}
          />
        ) : null,
      )}
      {!group && partial ? (
        <span className="sr-only">{t('Partly available')}</span>
      ) : null}
    </button>
  );
}
