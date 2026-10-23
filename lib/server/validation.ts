import { Temporal } from '@js-temporal/polyfill';
import { allSlots, isTimezone, localToUTC, SLOT, slotsToRanges } from '../../src/lib/time';
import type { CreateInput, TimeRange } from '../../src/lib/types';
import { weekdayDate } from '../../src/lib/weekly';
import { isEventDateAllowed } from '../../src/lib/date-limits';
export class Problem extends Error {
    constructor(public status: 400 | 403 | 404 | 409 | 410 | 413 | 429 | 503, message: string) {
        super(message);
    }
}
const uid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const checkId = (value: string) => {
    if (!uid.test(value)) {
        throw new Problem(404, 'This event or response could not be found.');
    }
};
export const text = (value: unknown, label: string, max: number, optional = false) => {
    if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) {
        throw new Problem(400, `Please enter ${label} (${max} characters or fewer).`);
    }
    return value.trim();
};
export function validateEvent(input: CreateInput) {
    const title = text(input.title, 'an event name', 100);
    const organizer = text(input.organizer_name ?? '', 'your name', 60, true);
    const description = text(input.description ?? '', 'a description', 1000, true);
    if (typeof input.timezone !== 'string' || !isTimezone(input.timezone)) {
        throw new Problem(400, 'Please choose a valid time zone.');
    }
    const mode = input.schedule_mode ?? 'dates';
    if (mode !== 'dates' && mode !== 'weekdays') {
        throw new Problem(400, 'Choose specific dates or days of the week.');
    }
    let dates: string[];
    if (mode === 'weekdays') {
        if (!Array.isArray(input.weekdays) || !input.weekdays.length || input.weekdays.length > 7 || input.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7) || new Set(input.weekdays).size !== input.weekdays.length) {
            throw new Problem(400, 'Choose at least one day of the week.');
        }
        dates = input.weekdays.map(weekdayDate);
    }
    else {
        if (!Array.isArray(input.dates) || !input.dates.length || input.dates.length > 31 || new Set(input.dates).size !== input.dates.length) {
            throw new Problem(400, 'Choose between 1 and 31 different dates.');
        }
        dates = input.dates;
    }
    const validTime = /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/;
    if (!validTime.test(input.startTime) || !(validTime.test(input.endTime) || input.endTime === '24:00') || input.endTime <= input.startTime) {
        throw new Problem(400, 'The end time must be after the start time on the same day.');
    }
    const windows: TimeRange[] = dates.map(date => {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Problem(400, 'Please choose valid dates.');
        }
        try {
            const d = Temporal.PlainDate.from(date);
            const today = Temporal.Now.plainDateISO(input.timezone);
            if (mode === 'dates' && !isEventDateAllowed(d, today)) {
                throw new Problem(400, 'Choose dates from today through December 31, 2050.');
            }
            const clockZone = mode === 'weekdays' ? 'UTC' : input.timezone;
            const start = localToUTC(date, input.startTime, clockZone);
            const end = localToUTC(date, input.endTime, clockZone);
            return { start, end };
        }
        catch (error) {
            if (error instanceof Problem) {
                throw error;
            }
            throw new Problem(400, 'A chosen time is invalid or repeats during a daylight saving change. Choose a different start or end time.');
        }
    });
    return { title, organizer, description, mode, windows: windows.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) };
}
export function validateRanges(input: unknown, windows: TimeRange[]) {
    if (!Array.isArray(input) || input.length > 3000) {
        throw new Problem(400, 'Please choose valid availability.');
    }
    const allowed = new Set(allSlots(windows));
    const selected = new Set<number>();
    let requestedSlots = 0;
    for (const range of input) {
        if (!range || typeof range.start !== 'string' || typeof range.end !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(range.start) || !/(Z|[+-]\d\d:\d\d)$/.test(range.end)) {
            throw new Problem(400, 'Availability needs a date, time, and time-zone offset.');
        }
        const a = Date.parse(range.start);
        const b = Date.parse(range.end);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || (b - a) % SLOT || b - a > 32 * 86400000) {
            throw new Problem(400, 'Please select complete 15-minute intervals.');
        }
        requestedSlots += (b - a) / SLOT;
        if (requestedSlots > allowed.size * 2) {
            throw new Problem(400, 'Too many overlapping selections. Please reload and try again.');
        }
        for (let t = a; t < b; t += SLOT) {
            if (!allowed.has(t)) {
                throw new Problem(400, 'Some selected times are outside this event. Reload the event and try again.');
            }
            selected.add(t);
        }
    }
    return slotsToRanges(selected);
}
