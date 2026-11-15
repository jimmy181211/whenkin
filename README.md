# Whenkin

Whenkin helps a group find a time to meet: create an event, share its link, and mark availability. It supports desktop and mobile, English, Simplified Chinese and Spanish, specific dates and typical weekdays, and automatic time-zone conversion.

## Website shortcuts

Whenkin supplies home-screen icons, a desktop favicon and a browser-mode web manifest from `App/frontend/public`. The icons reuse `favicon.svg`. The manifest deliberately omits a fixed start URL so a browser shortcut can preserve the page being saved, including an event link. Browser display mode keeps the normal browser interface; adding a shortcut is a user action in the browser.

The **Add a Shortcut** footer button opens localized device instructions and a copy button for the current page link. The sixth Quick Guide step points to this entry. Users can change the detected device/browser; menu wording may vary by browser version. The website does not create a shortcut without the browser or desktop confirmation.

- iPhone/iPad Safari: Share → Add to Home Screen. Turn off Open as Web App if that option is shown and you want a browser shortcut.
- Android Chrome: menu → Install and create shortcut → Create shortcut → Add. Menu wording can vary by version.
- Desktop Chrome: menu → Cast, save, and share → Create shortcut.

Open the homepage before adding a general Whenkin shortcut, or open an event to save that event's link. Event shortcuts retain the same one-year expiry as their links. These settings do not add an offline cache or a native app package.

Browser instructions: [Apple](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios), [Chrome for Android](https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=en), [desktop Chrome](https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DDesktop&hl=en).

## Run with Docker

Install Docker Desktop and start its engine, then run from this directory:

```sh
docker compose up --build
```

Open **http://localhost:3000**. Compose starts PostgreSQL, applies the existing migrations, then starts Whenkin. The default database is a new local database; this command does not copy or modify the existing production database. The local password is for development only.

```sh
docker compose down
```

The named database volume survives ordinary shutdowns. See [setup](docs/setup.md) for live-reload development and [deployment](docs/deployment.md) for EC2, backups and handoff.

## Code map

```text
App/
  frontend/
    pages/              URL-level screens
    components/         Calendar, availability grids, responders and dialogs
    api/                Browser HTTP client and event loading
    utils/              Browser display and interaction helpers
    i18n/               English, Chinese and Spanish translations
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

One repository, one package manifest, one lockfile. React and Vite provide the frontend, Express handles HTTP requests, and PostgreSQL stores events and responses. Docker Compose is the local and self-hosted deployment option. Next.js and Vinext are removed. The current Sites/Workers deployment identity, secrets configuration, Neon connection and a small Express adapter remain available during the transition in `infra/sites/`; the current-host artifact has a separate runtime verification command. Both deployment targets use Express.

## Develop without putting the application in Docker

Use Node.js 22.13+ and pnpm 11.25.0. Copy `.env.example` to `.env`, then:

```sh
pnpm install --frozen-lockfile
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Open **http://localhost:5173**. Vite reloads the frontend; the Node watcher reloads the API. You may also use an existing local PostgreSQL instance by setting `DATABASE_URL` in `.env`.

```sh
pnpm check
pnpm test
pnpm build
pnpm start
```

## Existing behavior

- Changes to availability save automatically. Navigation is not intercepted by an unsaved-changes dialog.
- Everyone with the event link can view, edit and delete shared responses. Deletion requires the existing small confirmation popup.
- Revision checks prevent stale saves and deletions from overwriting newer changes.
- Group Availability supports inspecting individual blocks and highlighting all periods when everyone is free.
- Date-based ranges remain UTC instants. Typical-week polls retain their existing reference-week encoding and display conversion.
- Links expire one calendar year after creation. Removal of old database rows remains manual; there is no new cleanup schedule.

## Maintenance commands

| Command | Purpose | Writes application data? |
| --- | --- | --- |
| `pnpm db:migrate` | Apply pending schema migrations, with checksums and transactions | Schema changes; existing migration contents are unchanged |
| `pnpm db:cleanup --dry-run` | Count events eligible for cleanup | No |
| `pnpm db:cleanup` | Delete eligible old events and their child rows | Yes |
| `pnpm db:analyze --output outputs/analytics` | Generate the existing local analysis report | Read-only database query; local report files |
| `pnpm db:verify-retention` | Test cleanup using simulated dates and disposable PGlite data | Test database only |

Generated reports stay in ignored `outputs/`. Credentials belong in server environment variables or an ignored `.env` file, and are not included in browser code or the Docker build context.

The existing hosted site remains at https://whenkin.j4ouyang.chatgpt.site until a separate production cutover. This source refactor does not itself migrate its database or switch its domain.

Source: https://github.com/jimmy181211/whenkin

