# Validation and Release Checks

## Current Changes

The creation form uses **Event Name** and offers two modes: **Specific dates** and **Days of the week**. Switching modes keeps both selections. Weekday polls select Monday–Sunday and use one shared time zone. Date-based events retain automatic local-time conversion.

Desktop and mobile use the same **Edit / Done** availability controls. A drag starting on a blank block marks time; a drag starting on a marked or partly marked block clears time. The action stays consistent throughout the drag. Done locks selection and permits scrolling; Undo is disabled until Edit is selected again. The time-label column can also scroll while editing.

The fine-tune controls and the event-hour editor have been removed, including the schedule-update API. Event hours and meeting length are chosen at creation. Existing events, responses, and private links are retained.

## Automated Verification

TypeScript passes, all 47 tests pass, and the production build passes. Coverage includes date-based scheduling, weekday validation, localized weekday labels, shared weekly clock ranges, whole-meeting matching, private response access, response updates, rejection of the removed schedule-update route, mark/clear drag behavior, daylight-saving changes, all three languages, connection errors, and write limits.

Tests use PGlite for the PostgreSQL-backed API lifecycle. Migration 005 was also applied and smoke-tested on the existing Neon development branch: the new mode persists, a Monday range retains its shared clock, and the optional organizer name remains supported. Temporary verification rows were removed from that development branch.

## Verification Limits

The managed preview server started, but the available browser could not open it. Visual browser checks and physical iOS/Android gestures have not been verified in this run. The responsive interface shares its components and selection logic across desktop and mobile; render checks cover the new labels and controls.

## Release Requirement

Apply `migrations/005_weekday_polls.sql` before deploying this version. Its default keeps existing events in date mode. Publication and source synchronization use the existing public Site and GitHub repository.
