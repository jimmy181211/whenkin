# Hosting through ChatGPT Sites

Whenkin is hosted and managed through ChatGPT Sites. A separate Vercel or Cloudflare account is not required. Sites manages its own underlying infrastructure.

The existing Neon project is `whenkin` (`gentle-thunder-71894819`), with production and development database branches. Existing tables and migrations are reused.

Configure `DATABASE_URL` as a secret through the native Sites runtime environment tool. It is used only by the server API and must never appear in client code, source control, a screenshot, or a public document.

The Site audience is public. Event privacy is enforced independently by the API. Event links remain unlisted. Organizer and response-edit tokens are independent, private links and only token hashes are stored in the database.

The website retains English, Simplified Chinese, and Spanish. Language and time-zone choices are independent, and display changes do not alter the actual saved UTC moments.

Apply `migrations/002_participant_privacy.sql` before deploying this revision. It adds the group-sharing setting, off by default for new and existing events. No availability records are changed.
