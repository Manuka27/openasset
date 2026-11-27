# OpenAsset project context

OpenAsset is an open-source Asset and Inventory Management System and a hands-on project for learning professional full-stack web development from beginner to advanced. The learner has experience building Microsoft Power Platform applications, especially Power Apps.

- **Development environment** — Windows, WSL2 Ubuntu, and VS Code.
- **Project path** — `~/open-source-learning/openasset`
- **Stack** — Next.js App Router, React, TypeScript, Tailwind CSS, Node.js, and npm.
- **Repository** — [Manuka27/openasset on GitHub](https://github.com/Manuka27/openasset)

## Completed work and lessons

- Set up WSL Ubuntu, Node.js, npm, Git, and VS Code. Created OpenAsset and ran it on `localhost:3000`.
- Learned Git branches, commits, pushes, and pull requests. Merged the first PR into `main`, synchronized local `main`, and created `feature/dashboard-data`.
- Learned TypeScript variables and JSX expressions. Created the reusable `src/components/StatCard.tsx` component and refactored the dashboard to pass values through props.
- Added sample metrics for Total Assets (12), Issued Assets (4), and Available Assets (8). Available Assets is calculated by subtracting issued assets from total assets.
- Codex added the cyan Total Locations card (3) and updated the layout to show one, two, or four columns on mobile, tablet, or desktop. Lint and TypeScript checks passed for that change.

## Current status and next action

- The active branch is `feature/dashboard-data`. Preserve all uncommitted work, including the inventory and authentication code.
- On 2026-11-26, verified the TypeScript fix in `saveDirectory` after restoring dependencies and generating Prisma Client 7.10.1. TypeScript, ESLint, and Prisma schema validation each exited with code 0.
- Docker Desktop Engine 29.9.3 is reachable from WSL. The private, Git-ignored `.env` passed Compose validation and keeps demo seeding disabled.
- Step 60 completed on 2026-11-26. Started only the PostgreSQL 17 service after confirming its container and volume names were unused. `openasset-db-1` reported healthy, and an authenticated read-only query reached the `openasset` database through `127.0.0.1:5432`. The new `openasset_openasset-db` volume is mounted at `/var/lib/postgresql/data`. Windows C: had 6.0 GiB free after startup.
- Step 61 completed on 2026-11-26. Verified the recovery and pre-migration source backups in `/home/manuka/openasset-backups` using SHA-256 checksums, archive extraction, and Git integrity checks. The current source backup excludes private environment settings and dependency and build directories.
- A read-only PostgreSQL check found zero application tables and zero Prisma migration history tables before migration. Prisma 7.10.1 generated and verified the initial migration at `prisma/migrations/20261126080258_init/migration.sql`.
- Step 63 completed on 2026-11-26. After verifying the backups, local PostgreSQL health, and 25 GiB of free space on Windows C:, applied `20261126080258_init` to the local `openasset` database with `npx prisma migrate deploy`. Prisma reported the database is up to date, and the migration history checksum matched the file.
- Verified 11 application tables, 11 primary keys, 11 foreign keys, and 24 additional indexes, including 8 unique indexes. Assignment has five foreign keys with restricted deletes, six lookup indexes, and the expected required and optional fields. The app enforces one open assignment per asset. Prisma schema validation, TypeScript, and ESLint passed.
- Step 64 prepared `prisma/seed.ts` for the existing Prisma 7.10.1 seed command. It defines 4 fictional categories, 3 locations, 5 employees, and 12 assets (7 available, 2 issued, 2 in maintenance, and 1 archived), with 2 open assignments and 1 returned assignment. The seed adds missing fixtures in one transaction and preserves existing assets and assignment history on reruns.
- The CLI creates `admin@openasset.example` once using Better Auth's server-side email signup and password hashing. It keeps the existing account on reruns. Public signup stays disabled. Prisma validation, TypeScript, ESLint, and mock checks passed.
- Step 65 completed using a hidden local password prompt and an opt-in seed run. Read-only checks verified 4 categories, 3 locations, 5 employees, 12 assets, 3 assignments, and one Better Auth administrator with a hashed credential. The private terminal verified the password with Better Auth. Each issued asset has one open assignment.
- Step 66 added the protected `/dashboard` route with live inventory counts and configured protected pages to resolve the session at request time without instant-navigation validation warnings. TypeScript, ESLint, localhost HTTP checks, and in-memory authentication, session, role, and dashboard tests passed. Anonymous requests to the dashboard and asset routes redirect to login. Windows reached the Next.js server at `http://localhost:3000/login`.
- The user confirmed browser admin sign-in and the original dashboard, asset listing, search and detail screens before the application completion pass.
- The workspace now includes live dashboard breakdowns, issue and return forms, category and location management, employee history and archival, administrator-controlled users, reports and CSV, audit logs, and an authenticated profile and password workflow.
- Both source backup checksums passed and Windows C: had 24 GiB free. Read-only PostgreSQL verification confirmed 12 total, 7 available, 2 issued, 2 maintenance and 1 archived asset, 3 active locations, one seeded administrator and zero duplicate open assignments. Six inventory report queries matched the seeded data.
- Next.js and its ESLint configuration were updated to 16.4.6 for the November security release. The production build, TypeScript, ESLint, Prisma validation, and 11 automated tests passed. The isolated PostgreSQL write suite was skipped pending database setup approval.
- Step 72 verified the employee and assignment migration on a disposable PostgreSQL 17 instance with a separate loopback port, fresh credentials and memory-backed storage. Legacy fictional fixtures were seeded before migration. All 11 application tables retained their original seeded rows through migration and through the write tests. The PostgreSQL lifecycle test passed, including concurrent issue, the unique open-assignment index, return, archival, permissions and history. The suite reported 11 passed and one optional HTTP test skipped.
- Verified the main database dump at `/home/manuka/openasset-backups/openasset-postgres-20261126T102430Z.dump` with SHA-256 and a full restore in a network-disabled container. All 12 main table fingerprints, including migration history, still matched the backup after testing. Windows C: had 23 GiB free. Both disposable containers stopped after verification.
- With explicit approval, applied `20261126110000_employee_and_assignment_lifecycle` to local OpenAsset on 2026-11-26. Prisma reports both migrations are applied and their checksums match. Windows C: had 23 GiB free. Post-migration fingerprints matched the backup for all original rows, including the initial migration record.
- Verified the three new indexes, the return-condition enum and all five assignment foreign keys. The existing two open assignments and one returned assignment retain consistent asset statuses and history. TypeScript and ESLint passed. A fresh isolated PostgreSQL run passed 11 tests, including the lifecycle suite and persisted return condition. One optional HTTP test was skipped.
- The premium UI now covers the login, dashboard and all workspace modules. It includes a responsive shell, browser-persisted themes, live PostgreSQL charts, accessible forms, loading states, and original sign-in art. See the [UI guide](UI_DESIGN.md) for design and asset details.
- Step 74 passed on 2026-11-26. TypeScript, ESLint, Prisma validation and the production build exited 0. The automated suite passed all 12 tests. Chromium verified the core workflows and layout at 375, 768, 1366 and 1920 pixels. Password rotation keeps the active browser signed in and revokes other sessions.
- The test container was removed after the run. The main database is healthy on its original volume with 12 assets, 3 assignments, 1 user, 2 applied migrations and zero browser QA assets. The persistent PostgreSQL backup checksum passed.
- **Next action** — Run `npm run dev`, sign in privately at `http://localhost:3000/login` and review the redesigned workspace in your usual browser. Then continue with the React props lesson in the [walkthrough](IMPLEMENTATION_WALKTHROUGH.md).

## Development roadmap

1. Verify the dashboard and understand React components and props.
2. Learn TypeScript arrays, objects, and data rendering.
3. Learn React state, forms, and event handling.
4. Build asset listing, search, and filtering.
5. Implement asset creation, editing, and deletion.
6. Learn server-side APIs and validation.
7. Integrate PostgreSQL and an appropriate ORM.
8. Implement authentication and role-based access.
9. Add testing, error handling, and security.
10. Learn Docker, local hosting, deployment, and CI/CD.

## Teaching preferences

- Act as a senior full-stack developer and personal mentor. Teach step by step like an interactive bootcamp.
- Use simple English with Sinhala explanations. Compare new coding concepts with Power Platform, especially Power Apps, where useful.
- Explain why each technology or technique is used and how it works.
- Give one practical step at a time and wait for the learner's result or screenshot. Review the output, correct mistakes, and then continue.
- Keep ordinary replies short to minimize token use. Provide complete explanations and practical examples when requested.
- Update this file as lessons are completed and record the next action.

## Coding rules

- Inspect the existing repository before making changes. Follow the project architecture and reuse existing components and patterns.
- Preserve existing work and keep changes small, testable, and focused on the task.
- Run relevant lint, TypeScript, and build checks after code changes.
- Get the user's approval before committing, pushing, merging, deploying, or deleting important files. Ask before major architecture or dependency changes.
- Explain important code changes and new concepts. Keep the work beginner-friendly and professionally structured.
