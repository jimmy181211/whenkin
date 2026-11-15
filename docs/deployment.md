# Deployment and handoff

This version targets the organization's existing EC2 server using Docker Compose. The domain can be `whenkin.ucsd-cssa.com`; moving to EC2 does not require changing that public name. Configure DNS only after a staging deployment and data verification.

## Existing EC2 server

Before deployment, inventory its current containers, reverse proxy, ports, available RAM/disk, PostgreSQL services, and backup schedule. Use a dedicated checkout directory and Compose project. Do not replace an existing reverse proxy or restart unrelated applications.

The base Compose file exposes the application and database only on loopback. On a server with an existing ingress, point the chosen hostname at `127.0.0.1:3000`, or select another `APP_PORT` if 3000 is occupied. Set `PUBLIC_ORIGIN=https://whenkin.ucsd-cssa.com`.

Only enable `TRUST_PROXY=true` when the backend is reachable through a trusted proxy that overwrites forwarded headers. The optional Caddy setup does this. A server's existing ingress must be checked separately.

For a fresh server without an existing HTTPS proxy, set a strong `DB_PASSWORD` and `DOMAIN` in an ignored `.env` file, then use:

```sh
docker compose -f compose.yaml -f compose.production.yaml up --build -d
```

The optional Caddy service listens on 80/443 and manages HTTPS for the configured domain. Do not start it if another service already owns those ports. Use the base configuration with that existing ingress instead.

## Updating

From the dedicated checkout, first back up the database. Fetch and check out the reviewed release commit, then run:

```sh
docker compose build
docker compose run --rm migrate
docker compose up -d app
```

The migration runner checks unchanged SQL history and applies only pending migrations. Check `docker compose ps`, the application health check, and logs. Verify creation and shared responses on a staging database before promoting a release.

The same steps can be automated through the organization's existing deployment system. This repository's GitHub workflow checks the application and Docker stack; it does not SSH into an unconfigured production server. Production credentials are not required for those checks.

## Database migration

The directory refactor preserves all eight existing migrations. Copying source code does not copy production data. Moving the database is a separate operation:

1. Take a PostgreSQL-compatible backup of the current database and verify its restore in an isolated database.
2. Check PostgreSQL versions, roles, required functions and migration checksums.
3. Use a temporary write freeze or a documented synchronization method for the final transfer, so edits are not lost during cutover.
4. Compare event, window, response and availability row counts, selected event contents and expiry behavior.
5. Switch the public application only after these checks pass; retain the old deployment for rollback.

The Node PostgreSQL driver also supports a hosted PostgreSQL connection URL. Keeping the existing database initially can separate application deployment from database migration.

## Backups and restore

Store backups outside the EC2 instance as well as any local working copy. A Docker volume protects against ordinary container replacement; it does not protect against instance or disk loss.

Avoid shell redirection for binary PostgreSQL dumps in Windows PowerShell. For the Compose database, create the dump inside the container and copy it out:

```sh
docker compose exec -T db pg_dump -U whenkin -d whenkin -Fc -f /tmp/whenkin.dump
docker compose cp db:/tmp/whenkin.dump ./whenkin.dump
```

Move the dump to the organization's private backup location. Restore a copy into a separate database regularly and test it. Never commit a dump or report containing real event data.

A restore example for a NEW, isolated verification database:

```sh
docker compose exec -T db createdb -U whenkin whenkin_restore_check
docker compose cp ./whenkin.dump db:/tmp/whenkin_restore_check.dump
docker compose exec -T db pg_restore -U whenkin -d whenkin_restore_check --no-owner /tmp/whenkin_restore_check.dump
```

Do not run a restore over the live database as an ordinary update step.

## Rollback and succession

Keep a known working image/release and a tested database backup. For this refactor, the schema is unchanged. For future schema changes, check backward compatibility before rolling application code back; restoring a backup can discard edits made since that backup.

The next maintainer needs organization-controlled access to:

- The GitHub repository and release process.
- EC2 deployment access and the directory/Compose project used by this application.
- Domain/DNS and the existing HTTPS proxy.
- The database configuration and private backups, including restore instructions.
- Billing, alerts and the responsible administrator's contact.

Grant individual access through the organization's normal process. No personal shared root key or personal hosting account is required by the application.
