# Validation and Release Checks

## Current Change

Remove the requested homepage and event-page details. Mobile uses a linked instructions page, shorter 26px time blocks, a wider grid, and New event beside Share Event inside the event card. Desktop slots remain 32px. The time-label column allows native scrolling in Mark and Clear modes, while touches on cells remain reserved for selecting availability.

Remove personal/group view switching, heatmap rendering, sharing settings, its API endpoint, and visibility flags. Participants receive only their own response and response counts; organizers retain all responses and ranked meeting suggestions. Existing sharing flags are ignored. Event titles are required and organizer names are optional; participant response names remain required.

## Automated Verification

TypeScript passes, all 43 tests pass, and the production build passes. Tests cover blank organizer names and invalid event titles, schedule edits, private response isolation even with legacy sharing enabled, removal of the settings endpoint and visibility fields, preserved availability and links, time zones and daylight-saving changes, all three languages, stale revisions, network failures, and write limits.

## Browser Verification

Local fixture-based previews verify the homepage, the instructions page, organizer and participant card layouts, absence of availability tabs, 26px mobile cells, 32px desktop cells, and wider mobile calendar spacing. Scrolling on the left clock column moves the grid from 0px to 100px in Mark mode and to 200px in Clear mode without selecting any availability. Computed touch-action permits native scrolling on the column and its ancestors while selection cells reserve touch input for painting. Physical iOS and Android touch gestures still require a device check.

## Deployment Status

These changes have not been deployed to Sites. The Windows environment rejects secure terminal input to the Sites source helper through automatic approval review. Migration 004 has been tested locally but not applied to production. Apply it before publishing.

The earlier public release was Sites version 3 on October 22, 2026, with source commit d6b2895415ba075125e8e50a5b2416eedcd554c4. Its historical sharing-mode checks do not validate the current removal of that feature. The public audience must remain unchanged when publishing.
