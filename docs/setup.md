# Hosting through ChatGPT Sites

Whenkin is hosted and managed through ChatGPT Sites. A separate Vercel or Cloudflare account is not required. Sites manages its own underlying infrastructure.

The existing Neon project is `whenkin` (`gentle-thunder-71894819`), with production and development database branches. Existing tables and migrations are reused.

Configure `DATABASE_URL` as a secret through the native Sites runtime environment tool. It is used only by the server API and must never appear in client code, source control, a screenshot, or a public document.

The Site audience is public. Event links remain unlisted, and everyone with a link can view the group responses and Common Ground. Private response-edit tokens protect updates; only their hashes are stored in the database. There is no separate organizer link.

The website retains English, Simplified Chinese, and Spanish. Language and time-zone choices are independent, and display changes do not alter the actual saved UTC moments.

Apply migrations in order for a new database. Migration 002 is retained for schema history; its sharing flag is no longer used by the application. All current event links allow viewing every saved response. Apply `004_optional_organizer_name.sql` before publishing optional organizer names; saved names and availability are preserved.

Apply `005_weekday_polls.sql` before publishing date/weekday mode support. The new schedule_mode column defaults to dates, preserving all existing events and private links. Test the migration and weekly response/schedule flows on a development branch first.

Apply `007_shared_events.sql` before publishing the shared-event version. It removes the participant cap, extends existing deadlines to one calendar year, and updates the manually invoked cleanup function. No Cloudflare account or scheduled task is needed.
