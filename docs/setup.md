# Local setup

## Docker-only setup

Install Docker Desktop on Windows/macOS, or Docker Engine with Compose on Linux. Start the Docker engine and run:

```sh
docker compose up --build
```

Open http://localhost:3000. No local Node.js or PostgreSQL installation is required for this path. Compose creates a fresh local database and applies migrations automatically.

`docker compose down` stops the project while preserving its named database volume. Back up data separately; a volume is not a backup.

## Live-reload development

Install Node.js 22.13+ and pnpm 11.25.0, copy `.env.example` to `.env`, and run:

```sh
pnpm install --frozen-lockfile
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Open http://localhost:5173. The development launcher starts Vite and the API watcher; Ctrl+C stops both. You can also run `pnpm dev:web` and `pnpm dev:api` in separate terminals.

An existing PostgreSQL instance also works: set its connection URL in `.env`, then run migrations. Neither a Cloudflare account nor a Neon account is needed for local development. A hosted PostgreSQL URL may be used when explicitly intended.

## Configuration

| Setting | Meaning |
| --- | --- |
| `DATABASE_URL` | Node and maintenance-tool PostgreSQL connection URL |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Alternative PostgreSQL settings, used inside Compose |
| `API_PORT` | Local API port, defaults to 3000 |
| `PORT`, `HOST` | Node listener, defaults to 3000 and 127.0.0.1; container binds 0.0.0.0 |
| `PUBLIC_ORIGIN` | Public website origin for write-origin validation; leave empty in local Vite development |
| `TRUST_PROXY` | Enable only behind a known ingress that overwrites forwarded headers |
| `DB_PASSWORD`, `DB_PORT`, `APP_PORT` | Compose database password and host ports |
| `DOMAIN` | Domain used by the optional production HTTPS proxy |

Compose uses its explicit PostgreSQL settings rather than forwarding the host's `DATABASE_URL`. If changing `DB_PASSWORD` after a database volume already exists, update the PostgreSQL role password as well; changing an environment variable does not change an existing database password.

## Checks

```sh
pnpm check
pnpm test
pnpm build
```

`pnpm start` runs the compiled Express server and serves the frontend on port 3000. `node tests/smoke.mjs http://127.0.0.1:3000` tests the full API flow against a disposable local database and creates a test event. It refuses non-local server URLs.

The GitHub workflow runs checks and builds, then starts the Docker stack and runs this smoke check against real PostgreSQL. No production database is used by the test suite.
