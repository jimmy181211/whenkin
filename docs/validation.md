# Validation and Release Checks

## Current Changes

The creation form uses **Event Name** and offers two modes: **Specific dates** and **Days of the week**. Switching modes keeps both selections. Weekday polls select Monday–Sunday and now have the same searchable time-zone selector as dated events. Weekly display conversions use offsets at the poll’s creation time; stored selections remain in organizer-clock coordinates. Date-based events retain automatic local-time conversion.

Desktop and mobile use the same **Edit / Done** availability controls. A drag starting on a blank block marks time; a drag starting on a marked or partly marked block clears time. The action stays consistent throughout the drag. Done locks selection and permits scrolling; Undo is disabled until Edit is selected again. The time-label column can also scroll while editing.

The fine-tune controls and the event-hour editor have been removed, including the schedule-update API. Event hours and meeting length are chosen at creation. Existing events, responses, and private links are retained.

The grid instruction line is removed. The name field has no routine hint. Empty names block editing upfront, with an accessible notice and focus on the name field when editing is attempted. The Save button is disabled when there are no pending changes or a save is running; there is no separate name-based button lock or late client-side name guard. The API keeps its required-name validation. A time-zone change preserves the current Edit/Done mode.

## Automated Verification

TypeScript passes, all 59 tests pass, and the production build passes. Coverage includes date-based scheduling, weekday validation, localized weekday labels, shared weekly storage ranges, reversible time-zone projection, summer/winter offsets, fractional-hour zones, Sunday/Monday wrapping, name-gated editing, whole-meeting matching, private response access, response updates, rejection of the removed schedule-update route, mark/clear drag behavior, daylight-saving changes, all three languages, connection errors, and write limits.

Tests use PGlite for the PostgreSQL-backed API lifecycle. Migration 005 was also applied and smoke-tested on the existing Neon development branch: the new mode persists, a Monday range retains its shared clock, and the optional organizer name remains supported. Temporary verification rows were removed from that development branch.

## Verification Limits

The managed browser preview opens the updated homepage and its weekly/date controls. Full event-page browser checks could not be completed because the preview could not connect to the development database. Event-page rendering, name gating, and conversion logic are covered by automated checks. Physical iOS/Android gestures have not been verified in this run. Temporary local database configuration was removed. The responsive interface shares its components and selection logic across desktop and mobile; render checks cover the new labels and controls.

## Release Requirement

Apply `migrations/005_weekday_polls.sql` before deploying this version. Its default keeps existing events in date mode. Publication and source synchronization use the existing public Site and GitHub repository.

## Participant Control Layout

The event-page weekly conversion note is removed. The searchable time-zone selector sits beside the name input on event cards with at least 620px of content width. On narrower cards it moves above the name input. An attempted edit without a name shows the editing notice directly below the input. These layout changes preserve name gating, saving, and all time-zone conversion behavior.

The creation page also removes the “When might work?” heading and explanatory sentence beneath the date/weekday mode switch. The mode buttons and both pickers remain available in all three languages.

## Availability Status and Top Five Matches

Availability has three visible statuses: Not Started for a fresh response, Unsaved Changes for draft changes (including an in-progress or failed save), and Saved Changes only after a confirmed save. Your Common Ground omits its explanatory sentence and shows at most five ranked, non-repetitive matches on desktop and mobile. Pagination state and the Show more button are removed.

## Private Edit Links and Title Case

Every event page shows the private edit-link section. The copy button is disabled until the current participant has a saved response and an edit token. No placeholder helper text appears before the link is available. Organizer and other participant credentials are never substituted. Built-in English titles, field labels, and action buttons use Title Case, while descriptions and visitor-entered event names are preserved.

The response status now sits beside the Edit / Done control on both desktop and mobile. It no longer appears next to the name input or in the event header. Labels are Not Started, Unsaved Changes, and Saved Changes.

## Event Page Spacing and Actions

Your Common Ground has 16px of space before its time-zone line. New Event and Share Event are grouped beside each other at every width; the event title can move above the pair when space is limited. The redundant header action is removed. The routine name-to-save hint and private-link placeholder sentence are removed in all languages. The up-front name requirement for editing and server validation remain in place.
