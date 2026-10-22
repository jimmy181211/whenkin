# Validation and Release Checks

## Current Change

Implements server-enforced participant privacy with an organizer group-sharing switch; 30-minute display blocks with 15-minute fine-tuning; inline name validation; unsaved-change dialogs and browser unload protection; all requested content removals; English and Spanish Title Case; responsive containment rules; and current architecture and user-flow diagrams. The standalone guide route and component are removed. The home page retains its three brief steps.

## Automated Verification

TypeScript checking, the Vinext production build, and all 36 automated tests passed during this change. Tests cover PostgreSQL event and response lifecycles, default privacy, participant-token isolation, organizer-only settings, sharing on and off, response counts, stale revisions, time zones, repeated and missing daylight-saving hours, 30-minute display with preserved 15-minute instants, all three languages, network failures, and bounded write protection. Existing legacy calendar API tests remain for backward compatibility; the website no longer displays a confirmed meeting or offers confirmation controls.

## Deployment Status

The website's current audience is public at https://whenkin.j4ouyang.chatgpt.site. This change has not been deployed. The Sites source helper remains blocked by the current session policy (`sandbox_approval = false`); the Windows Git subprocess also reports a transport failure. The code was recovered from the connected GitHub repository and preserved for review. No production schema changes have been applied. The migration was also applied successfully to a fresh Neon branch of production: the new flag is non-null with default false, both existing events were preserved, and neither event had sharing enabled.

Before deploying, apply migration 002 to Neon, synchronize this exact source with the existing Sites project, package the build and save/deploy through Sites. Keep the audience public. The database connection must remain a server-only runtime secret.

## Remaining Browser and Device Verification

The browser origin-approval gate declined opening the local preview. Visual layout, browser interactions, and physical-device touch behavior could not be independently verified in this session. Earlier browser results belong to the previous release and do not validate these changes.

1. Create an event and preserve its private organizer link. Open its participant link in an independent browser.
2. With sharing off, verify the participant sees only their own response and the count. Inspect network responses for the absence of other participant data and suggestions.
3. Turn sharing on and verify the existing group interface; turn it off and refresh to verify private data is no longer returned.
4. Select a 30-minute range, adjust it to quarter-hour boundaries, save, reload, and verify the half-block display and exact UTC instants in another time zone.
5. Without a name, press Save: focus and inline error must appear beside the name field, with no bottom notice. Other editing controls remain usable.
6. Change form fields or availability, then leave via a site link: verify Keep Editing and Leave Without Saving. Refresh, close, and browser navigation use the standard browser warning while changes are unsaved.
7. Confirm saved changes allow normal navigation and unsaved drafts can be restored.
8. At desktop and 320-, 375-, 390-, and 768-pixel widths, check English, Simplified Chinese, and Spanish: no overflowing text, clipped controls, or layout distortion. English and Spanish titles use Title Case; user-entered event titles remain unchanged.
9. On iOS Safari and Android Chrome, verify painting, scroll mode, zoom, undo, partial selections, and precise From/To controls.
10. Verify the retired guide URL returns 404 and no guide links, circled copy, misleading header date, or confirmed-time display remain.
