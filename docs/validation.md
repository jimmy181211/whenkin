# Validation

The original baseline passed 110 tests and TypeScript checks before refactoring.

The Express refactor passed 118 tests, TypeScript checks and the Node/Vite production build before the current-host compatibility adapter was added. The suite includes the original scheduling, language, autosave-client and database behavior checks, plus real HTTP route tests and isolated migration-runner checks.

The manual retention verifier passed both its simulated one-calendar-year and ten-day scenarios using disposable PGlite data. Each scenario deleted exactly the expected 207 event rows and their child rows, preserved all younger data, and left no orphaned rows. Production data and retention policy were not changed.

Browser verification of the compiled Express application used a disposable local PGlite database. It verified event creation, navigation to the new event URL, automatic saving of a named response, the everyone-free highlight toggle, and per-block availability details. The Chinese layout was inspected at a 390px viewport with no horizontal page overflow. The screenshot is a local ignored QA artifact.

Before this branch is released, finish the retained Sites/Workers Express adapter build and runtime checks, rerun the full suite and both build targets, and verify Docker Compose against PostgreSQL after the local Docker engine is available. No production deployment or database migration has been performed by this refactor so far.
