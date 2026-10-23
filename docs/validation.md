# Validation and Release Checks

## Current Changes

The creation form uses **Event Name** and offers two modes: **Specific dates** and **Days of the week**. Switching modes keeps both selections. Weekday polls select Monday–Sunday and now have the same searchable time-zone selector as dated events. Weekly display conversions use offsets at the poll’s creation time, disclosed in the interface; stored selections remain in organizer-clock coordinates. Date-based events retain automatic local-time conversion.

Desktop and mobile use the same **Edit / Done** availability controls. A drag starting on a blank block marks time; a drag starting on a marked or partly marked block clears time. The action stays consistent throughout the drag. Done locks selection and permits scrolling; Undo is disabled until Edit is selected again. The time-label column can also scroll while editing.

The fine-tune controls and the event-hour editor have been removed, including the schedule-update API. Event hours and meeting length are chosen at creation. Existing events, responses, and private links are retained.

The grid instruction line is removed. The name hint is directly under the input. Empty names block editing upfront, with an accessible notice and focus on the name field when editing is attempted. Save remains disabled until a name is supplied; the late save-time name error is removed. The API keeps its required-name validation. A time-zone change preserves the current Edit/Done mode.

## Automated Verification

TypeScript passes, all 54 tests pass, and the production build passes. Coverage includes date-based scheduling, weekday validation, localized weekday labels, shared weekly storage ranges, reversible time-zone projection, summer/winter offsets, fractional-hour zones, Sunday/Monday wrapping, name-gated editing, whole-meeting matching, private response access, response updates, rejection of the removed schedule-update route, mark/clear drag behavior, daylight-saving changes, all three languages, connection errors, and write limits.

Tests use PGlite for the PostgreSQL-backed API lifecycle. Migration 005 was also applied and smoke-tested on the existing Neon development branch: the new mode persists, a Monday range retains its shared clock, and the optional organizer name remains supported. Temporary verification rows were removed from that development branch.

## Verification Limits

The managed browser preview opens the updated homepage and its weekly/date controls. Full event-page browser checks could not be completed because the preview could not connect to the development database. Event-page rendering, name gating, and conversion logic are covered by automated checks. Physical iOS/Android gestures have not been verified in this run. Temporary local database configuration was removed. The responsive interface shares its components and selection logic across desktop and mobile; render checks cover the new labels and controls.

## Release Requirement

Apply `migrations/005_weekday_polls.sql` before deploying this version. Its default keeps existing events in date mode. Publication and source synchronization use the existing public Site and GitHub repository.
