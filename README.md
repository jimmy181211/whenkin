# Whenkin

Whenkin helps a group find a time to meet: create an event, share its link, and mark availability.
It supports desktop and mobile, English and Simplified Chinese, specific dates and typical weekdays,
and automatic time-zone conversion.

## Website shortcuts

Whenkin supplies home-screen icons and a desktop favicon from `App/frontend/public`. The icons reuse
`favicon.svg`. `App/backend/web-manifest.ts` serves installation metadata at `/site.webmanifest`;
the initial HTML declares the manifest for its own page. Known page paths become the launch URL and
app identity, preserving event destinations without saving query tokens. Both Node/EC2 and the
current Sites adapter use this same metadata.

The **Add a Shortcut** footer button first invokes a browser-supplied `beforeinstallprompt` offer,
captured at startup in `App/frontend/utils/browser-install.ts`. It is single-use and requires the
user's click and confirmation. If no offer is available or prompting fails, localized instructions
open instead. Dismissing the native prompt does not open another popup. Browser eligibility,
engagement, installation state and policy decide when an offer is available; browser name alone is
not a capability check. The sixth Quick Guide step points to this entry.

- iPhone/iPad: Share → Add to Home Screen. Keep Open as Web App enabled if shown.
- Android Chrome: menu → Add to Home screen / Install app → Install. Menu wording varies by version.
- Desktop Edge: menu → More tools → Apps → Install this site as an app (some versions expose Apps
  directly).
- Desktop Chrome: menu → Cast, save, and share → Install page as app.
- Safari on supported macOS: File → Add to Dock.

Open the homepage to add a general Whenkin launcher, or an event to save that event's link. The
standalone website uses the supplied Whenkin icons, subject to browser/OS presentation; some Android
shortcuts retain a browser badge. Ordinary Windows URL shortcuts may continue to show the default
browser icon and are not rewritten by website updates. Event shortcuts follow their links'
configured expiry (initially 12 months). This adds no service worker, offline cache, app-store
package, or automatic installation.

Browser instructions:
[Apple](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios),
[Chrome](https://support.google.com/chrome/answer/9658361),
[Edge](https://support.microsoft.com/en-gb/edge/install-manage-or-uninstall-apps-in-microsoft-edge),
[Safari on Mac](https://support.apple.com/en-us/104996).
[Prompt criteria](https://web.dev/articles/install-criteria) and
[platform installation differences](https://web.dev/learn/pwa/installation).

## Run with Docker

Install Docker Desktop and start its engine, then run from this directory:

```sh
docker compose up --build
```

Open **http://localhost:3000**. Compose starts PostgreSQL, applies the existing migrations, then
starts Whenkin. The default database is a new local database; this command does not copy or modify
the existing production database. The local password is for development only.

```sh
docker compose down
```

The named database volume survives ordinary shutdowns. See [setup](docs/setup.md) for live-reload
development and [deployment](docs/deployment.md) for EC2, backups and handoff.

## Code map

See [code readability](docs/code-style.md) for formatting commands, naming and responsibility
boundaries. Use `pnpm format` before submitting changes.

```text
App/
  frontend/
    pages/              URL-level screens
    components/         Calendar, availability grids, responders and dialogs
    api/                Browser HTTP client and event loading
    utils/              Browser display and interaction helpers
    i18n/               Interface translations and locale selection (English and Chinese)
    content/            Existing legal documents
    public/             Static assets
    App.tsx             Page selection and shared layout
    main.tsx            React entry point
  backend/
    api/                One file per API endpoint
    shared/             Validation, common-time calculation, errors and rate limit
    db/                 PostgreSQL connection and unchanged migration history
    tools/              Explicit build, development and maintenance commands
    app.ts              Express middleware and API registration
    web.ts              Static frontend and direct-link handling
    server.ts           Node.js startup and shutdown
  shared/               API types, pure time calculations and route recognition
infra/                  Docker image and optional HTTPS proxy
```

One repository, one package manifest, one lockfile. React and Vite provide the frontend, Express
handles HTTP requests, and PostgreSQL stores events and responses. Docker Compose is the local and
self-hosted deployment option. Next.js and Vinext are removed. The current Sites/Workers deployment
identity, secrets configuration, Neon connection and a small Express adapter remain available during
the transition in `infra/sites/`; the current-host artifact has a separate runtime verification
command. Both deployment targets use Express.

## Develop without putting the application in Docker

Use Node.js 22.13+ and pnpm 11.25.0. Copy `.env.example` to `.env`, then:

```sh
pnpm install --frozen-lockfile
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Open **http://localhost:5173**. Vite reloads the frontend; the Node watcher reloads the API. You may
also use an existing local PostgreSQL instance by setting `DATABASE_URL` in `.env`.

```sh
pnpm check
pnpm test
pnpm build
pnpm start
```

## Existing behavior

- Changes to availability save automatically. Navigation is not intercepted by an unsaved-changes
  dialog.
- Everyone with the event link can view, edit and delete shared responses. Deletion requires the
  existing small confirmation popup.
- Revision checks prevent stale saves and deletions from overwriting newer changes.
- Group Availability supports inspecting individual blocks and highlighting all periods when
  everyone is free.
- Date-based ranges remain UTC instants. Typical-week polls retain their existing reference-week
  encoding and display conversion.
- Link retention is configured in whole calendar months, initially 12. The shared expiry notice,
  database deadlines and manual cleanup use the same policy. See
  [retention maintenance](docs/retention.md).

## Maintenance commands

- `pnpm db:migrate`: Apply pending schema migrations, with checksums and transactions. Writes
  application data: Schema changes; existing migration contents are unchanged.
- `pnpm db:cleanup --dry-run`: Count events eligible for cleanup. Writes application data: No.
- `pnpm db:cleanup`: Delete eligible old events and their child rows. Writes application data: Yes.
- `pnpm db:cleanup --months 2 --dry-run`: Preview a proposed two-month cutoff. Writes application
  data: No.
- `pnpm db:analyze --output outputs/analytics`: Generate the existing local analysis report. Writes
  application data: Read-only database query; local report files.
- `pnpm db:verify-retention`: Test cleanup using simulated dates and disposable PGlite data. Writes
  application data: Test database only.

Generated reports stay in ignored `outputs/`. Credentials belong in server environment variables or
an ignored `.env` file, and are not included in browser code or the Docker build context.

The existing hosted site remains at https://whenkin.j4ouyang.chatgpt.site until a separate
production cutover. This source refactor does not itself migrate its database or switch its domain.

The current GitHub workflow tests and builds pushes to `main`; it does **not** automatically deploy
the hosted website. Release the configurable retention feature only after applying migration 009 to
the target database.

Source: https://github.com/jimmy181211/whenkin
