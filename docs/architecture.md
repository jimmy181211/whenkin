# Architecture

Whenkin is a single application with a React/Vite browser frontend, an Express/Node.js HTTP backend and PostgreSQL. Production serves the frontend and API from one origin. Development uses Vite's `/api` proxy.

## Boundaries

- `App/frontend/pages`: complete pages selected by URL. Components used inside pages belong in `components`.
- `App/frontend/api`: browser requests. The browser never imports a database connection or backend implementation.
- `App/backend/api`: each file owns one endpoint's processing and SQL. There is no extra controller/service/repository hierarchy.
- `App/backend/shared`: genuinely reused backend validation, event loading, common-time calculation and error handling.
- `App/backend/db`: PostgreSQL connection pool and the original eight migrations. SQL history is preserved.
- `App/shared`: request/response types, pure time/date rules and route recognition. It imports neither frontend translations nor backend connections.
- `infra`: container and deployment configuration. These are independent from business rules.

## Popup components

Use `App/frontend/components/PopupSurface.tsx` for new popup surfaces. Its stylesheet owns the shared white background, teal border, rounded corners and shadow; individual components only define layout and interaction. `Toast` and `useNotice` provide the anchored, automatically dismissed field reminders used for both event names and responder names. `AnchoredPanel` adds positioning for availability inspection and the small deletion confirmation. Sharing, time-zone menus and Quick Guide cards reuse the same surface while retaining their existing behavior.

Required-field reminders use `useNotice().notifyRequired(message, field)`: it animates the page or containing scroll panel over 650ms, focuses with `preventScroll`, then shows the reminder. Short desktop moves use the same duration as longer mobile moves. It yields to manual interaction, cancels pending feedback when dismissed or unmounted and respects reduced-motion settings. New required fields should use this shared flow. `EditableSelect` provides the month/year comboboxes; only an allowed option can be committed. `pages/EventUnavailablePage.tsx` handles expired and missing event states inside the existing event route, with policy and recovery links. Network/server failures retain their separate error state.

## HTTP endpoints

| Method | URL | Handler |
| --- | --- | --- |
| GET | `/api/health` | `App/backend/api/health.ts` |
| POST | `/api/events` | `App/backend/api/create-event.ts` |
| GET | `/api/events/:id` | `App/backend/api/get-event.ts` |
| POST | `/api/events/:id/responses` | `App/backend/api/create-response.ts` |
| PUT | `/api/events/:id/responses/:responseId` | `App/backend/api/update-response.ts` |
| DELETE | `/api/events/:id/responses/:responseId` | `App/backend/api/delete-response.ts` |

Each handler receives the database explicitly. Endpoint URLs and response shapes are retained. JSON request bodies are limited to 128 KiB. Public errors do not expose database connection details. Write-origin checks and the bounded write limiter remain in `app.ts`.

## Data consistency

Response create/update/delete operations keep their original single-statement SQL, event locking, schedule revision and response revision checks. Deleting a response cascades only to its availability. The backend computes everyone-free intersections; the frontend displays and highlights them.

The Node PostgreSQL adapter uses one bounded connection pool. Migrations use a checked-out connection for their advisory lock and each migration transaction, so schema changes and their checksum commit together. Re-running migrations skips unchanged files and rejects altered history.

## Deployment

The image includes frontend assets, compiled backend, database connection and maintenance tools. PostgreSQL runs separately with a named data volume. Compose waits for PostgreSQL readiness and successful migrations before starting the application. The application health check verifies database access.

The optional production Compose override supplies Caddy for HTTPS. Existing servers that already run Nginx, Caddy or another ingress should reuse that proxy instead of creating a competing listener on ports 80/443.

One Node process is the initial deployment. The write limiter is intentionally per-process; a deployment with multiple app instances must select a shared limiter or apply the limit at its trusted ingress.

## Existing hosted environment

`infra/sites/index.ts` adapts the same Express application to the current Workers runtime. It retains the existing Neon HTTP transport because the current hosting environment does not provide the ordinary PostgreSQL TCP connection used by EC2. The active framework is Express for both targets.

`wrangler.json` stays at the repository root so existing ignored `.dev.vars` files remain discoverable. Its Site identity and unused storage declarations remain in `.openai/hosting.json`. No credentials are stored in either tracked file. Asset behavior is explicit so direct event URLs return the React document rather than a redirect with an empty body.

The Worker resolves the application document internally using `/` and, when necessary, `/index.html`. It accepts only a successful HTML response because hosted assets can redirect the index file to the root even when local asset settings differ. This keeps the browser on its original event URL; an asset redirect is never rewritten into an empty HTTP 200. Runtime smoke checks cover both canonical HTML handling and the local configuration.

Build output is separated: `dist/client` contains the frontend, `dist/node` contains the Node backend, and `dist/server/index.js` is the current-host Worker artifact. `dist/server/wrangler.json` is generated with paths relative to the build output.

Migration SQL contents are unchanged. `.gitattributes` standardizes SQL line endings, and the migration runner recognizes identical LF/CRLF historical checksums so Windows/Linux checkouts can share the same migration history. Actual SQL edits still fail the checksum check.
