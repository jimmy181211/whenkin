# Validation

The original baseline passed 110 tests before refactoring. The final Express version passes 119 tests and TypeScript checks. Vitest uses two workers with a bounded 30-second timeout so Docker builds do not starve test processes on development laptops.

Both builds pass: Vite/Node for Docker and the retained Worker artifact for the current hosted environment. `pnpm test:sites` exercises the actual built Worker/Express runtime using disposable PGlite data and an intercepted Neon transport. It covers all six endpoints, shared times, revision conflicts, expiry, origin and request-size checks, direct links and asset routing. It never accesses production.

Docker Desktop and WSL are installed and the Linux engine is running. The independent `whenkin-refactor-qa` stack built successfully with real PostgreSQL 17. The database and application containers are healthy, all eight migrations completed, and `tests/smoke.mjs` passed event creation/read, response creation/update/deletion, shared times, stale-write protection and direct page links. Rebuilding and rerunning migrations preserved the existing test event and skipped unchanged migration files.

The manual retention verifier passed simulated one-calendar-year and ten-day scenarios in disposable PostgreSQL data: exactly 207 expected event rows were deleted in each scenario, related rows cascaded correctly, younger data remained unchanged, and no orphans remained. Production data and retention policy were not changed.

Browser verification of the compiled Express application checked event creation, automatic saving, everyone-free highlighting and block inspection. The Chinese layout was inspected at 390px with no horizontal page overflow. Existing English/Chinese/Spanish presentation and time-zone cases also pass in the automated suite.

All eight migration files retain their original SQL contents. Their committed blob IDs match the original files. The migration runner accepts equivalent LF/CRLF historical checksums across operating systems and rejects substantive edits. The current hosted deployment identity, root `.dev.vars` support and Neon transport are retained. No production database migration, DNS change or EC2 cutover has been performed.

The guide and popup update retains all three original guide entries verbatim and adds Responders and When Everyone Is Free before Share Event. All 119 tests and TypeScript checks pass. Browser checks verified the five-step flow, event creation, responder autosave, matching event-name and responder-name notices, sharing and the small deletion confirmation. English, Chinese and Spanish layouts were checked, including 390px and 320px mobile widths. At the page bottom, the guide card moves above its target so the shared-free-time section stays visible; the measured overlap was zero. All popup surfaces share the same reusable white/teal styling. Production builds and the built Worker smoke test pass using disposable data.
