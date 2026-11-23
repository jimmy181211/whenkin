/** Renders one time block, including selection, shared highlights, and inspection. */
import { t } from '../i18n/index';
import {
  slotDuration,
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

/**
 * Shared calendar data and callbacks passed from the grid to each time
 * block.
 */
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

/**
 * The slots and grid coordinates needed to render one visible calendar
 * block.
 */
type Props = {
  /** Saved slots in this block: one for new events, up to two for legacy events. */
  cells: GridCell[];
  rowMinute: number;
  rowIndex: number;
  columnIndex: number;
  context: AvailabilityCellContext;
};

/**
 * Calendar block component for personal selections and group availability. A
 * New events select a whole 30-minute slot. Legacy events retain their two
 * quarter-hour parts, including partial selection and availability counts.
 * @returns An interactive time block with selection, heatmap, and highlight
 * indicators, or an empty placeholder when no slots exist.
 */
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
  // End bounds are exclusive; the final slot contributes its event-specific duration.
  const blockEnd = cells.at(-1)!.stamp + slotDuration(event);
  const selectedCells = cells.filter(
    /* Select this block's underlying slots that are marked available. */
    (c) => selected.has(canonicalStamp(c.stamp)),
  );
  // "active" means the entire visible block is selected, not merely hovered.
  const active = selectedCells.length === cells.length;
  // At least one underlying slot is selected, but the entire block is not.
  const partial = selectedCells.length > 0 && !active;
  const inspected =
    group &&
    inspection &&
    cells.some(
      /* Check whether the open inspection includes a slot in this block. */
      (c) => inspection.stamps.includes(canonicalStamp(c.stamp)),
    );
  const highlightedCells = cells.map(
    /** Determine shared-time highlighting separately for each underlying slot. */
    (c) =>
      group &&
      highlights.some(
        /** Check whether this stored slot starts inside a shared free-time range. */
        (range) =>
          canonicalStamp(c.stamp) >= Date.parse(range.start) &&
          canonicalStamp(c.stamp) < Date.parse(range.end),
      ),
  );
  // A partial shared-time highlight needs different styling from a fully matched block.
  const highlighted = highlightedCells.some(Boolean);
  const fullyHighlighted = highlightedCells.every(Boolean);
  const cellCounts = cells.map(
    /* Look up available-person counts for this block's slots, defaulting to zero. */
    (c) => counts.get(canonicalStamp(c.stamp)) ?? 0,
  );
  // A block may contain different counts, so its label can show a range (e.g. 1–2).
  const minimum = Math.min(...cellCounts);
  const maximum = Math.max(...cellCounts);
  const groupLabel = t('{count} of {total} available', {
    count: minimum === maximum ? minimum : `${minimum}–${maximum}`,
    total: event.responses.length,
  });
  // Screen-reader description of the date, range, timezone, and availability state.
  const label = `${formatDay(
    cell.stamp,
    clockZone,
    false,
    weekly,
  )}, ${formatTime(cell.stamp, clockZone)}–${formatTime(
    blockEnd,
    clockZone,
  )}, ${weekly ? zoneLabel(zone) : 'UTC' + cell.offset}, ${group ? groupLabel : t(partial ? 'Partly available' : active ? 'Available' : 'not selected')}`;

  /**
   * Open availability details for every slot in this block.
   * Use stored timestamps to look up responders and display timestamps for the label.
   * @param anchor - Button whose position anchors the details panel.
   */
  function inspectSlot(anchor: HTMLButtonElement) {
    onInspect?.({
      anchor,
      stamps: cells.map(
        /* Use stored slot coordinates when requesting responder details. */
        (c) => canonicalStamp(c.stamp),
      ),
      range: {
        start: new Date(cell.stamp).toISOString(),
        end: new Date(blockEnd).toISOString(),
      },
    });
  }

  const background = group
    ? `linear-gradient(to bottom, ${cellCounts
      .map(
        /** Paint each underlying slot's portion of the group heatmap. */
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
      onPointerEnter={
        /* Inspect a group block on mouse hover without treating touch movement as hover. */
        (e) => {
          if (group && e.pointerType !== 'touch') {
            inspectSlot(e.currentTarget);
          }
        }
      }
      onFocus={
        /* Show the same group details when keyboard focus reaches the block. */
        (e) => {
          if (group) {
            inspectSlot(e.currentTarget);
          }
        }
      }
      onClick={
        /* Inspect group availability or explain why personal editing is blocked. */
        (e) => {
          if (group) {
            inspectSlot(e.currentTarget);
          } else if (!canEdit) {
            onEditBlocked?.();
          }
        }
      }
      onKeyDown={
        /* Toggle this personal block with Space or Enter and retain undo history. */
        (e) => {
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
              cells.map(
                /* Convert keyboard-selected slots back to saved coordinates. */
                (c) => canonicalStamp(c.stamp),
              ),
              selectedCells.length > 0,
            ),
          );
        }
      }
    >
      {highlightedCells.map(
        /**
         * @returns A shared-time outline for this block portion, or null when
         * no outline is needed.
         */
        (yes, index) =>
          yes && (!fullyHighlighted || index === 0) ? (
            <span
              key={index}
              aria-hidden="true"
              className="shared-highlight-slice"
              style={{
                top: fullyHighlighted
                  ? '0%'
                  : (index * 100) / cells.length + '%',
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
