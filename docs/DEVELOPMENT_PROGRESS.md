# OpenAsset development progress

## Application completion checkpoint

The existing PostgreSQL volume, local administrator, development fixtures, Git history, and uncommitted source were preserved. Both persistent source backups passed SHA-256 and archive checks. Windows C: had 24 GiB free at the start of development.

| Phase | Source delivered | Verification |
| --- | --- | --- |
| Audit and core repairs | Reviewed installed Next.js and Prisma versions, existing schema, actions, auth and Git status. Added an all-status inventory filter, more precise login feedback and mutation forms that retain non-secret edits after errors. | Existing backup and SQL preview inspected. |
| Assignments | Issue and return UI, active/overdue/returned history and search, condition handling, transactional checks and a partial unique index for open assignments. | Unit checks cover transitions, duplicates, archived employees and transaction retry. |
| Management | Category and location lists, search, create, edit and archive. Employee directory, active assets and paginated history. Administrator-controlled users and roles. | Type and role checks cover source paths. Live writes require the reviewed migration and isolated test database approval. |
| Reporting and administration | Eight filtered reports, CSV export, restricted audit viewer, own profile update and password change. | CSV escaping has an automated check. |
| Dashboard and interface | Live breakdown charts, assignment and return lists, inventory activity, responsive workspace navigation, reusable lists and forms. | Local HTTP and build results are recorded below. |

## Migration boundary

`prisma/migrations/20261126110000_employee_and_assignment_lifecycle/migration.sql` was generated with Prisma 7.10.1. It creates the return-condition enum, adds nullable columns, and creates three indexes. It contains no data updates, deletes, drops or resets. Existing employees can retain a missing staff number and department until edited. Historical returns retain their original notes. The unique partial index requires zero existing pairs of open assignments for an asset. Check that condition before application.

The reviewed migration passed isolated testing in Step 72 and was applied to the main local OpenAsset database with explicit approval. Use a separate local database named `openasset_test` or `openasset_test_<suffix>` for write tests.

## Verification

- Prisma schema validation, Prisma Client generation, TypeScript and ESLint passed.
- The initial production build failed on the external font fetch. After switching to system fonts, Next.js 16.4.3 compiled but stopped with its security notice. Next.js and its ESLint configuration were updated to 16.4.6, and the production build exited 0. [Next.js November security release](https://nextjs.org/blog/november-2026-security-release)
- With the production build served on loopback, 11 tests passed. They covered anonymous redirects, CSV access controls, disabled public signup, Better Auth session and password behavior in memory, role checks, input validation, assignment transitions, and CSV escaping.
- Read-only queries verified all four asset status totals, three active locations, the existing administrator and zero duplicate open assignments. Six of eight report data sources were verified on the current schema.
- Step 72 recreated the original schema and fictional fixtures with fresh test credentials on an isolated PostgreSQL 17 instance. The migration succeeded with matching migration checksums, all three indexes, and unchanged legacy rows. The PostgreSQL lifecycle suite passed for asset create, edit and archive, concurrent issuing, the database uniqueness constraint, return, directory and employee archive, permissions, and audit history. The complete run reported 11 passed and one optional HTTP test skipped.
- The persistent main database dump passed SHA-256 and a full restore rehearsal. The immediate preflight matched all 12 main table fingerprints to the archive. After the approved migration, the original columns and rows still matched, including the original migration history record.
- Prisma reports the local schema is up to date and both checksums match. Read-only checks verified the partial unique open-assignment index, the employee ID and overdue lookup indexes, all five assignment foreign keys, and the three allowed return conditions. The existing two open and one returned assignment remain consistent with inventory status.
- After the approved lifecycle migration, TypeScript and ESLint passed. On a fresh disposable PostgreSQL instance, 11 tests passed and the optional HTTP test was skipped. Integration checks exercised concurrent issue, duplicate prevention, return and persisted condition, permissions, archival, and history.

## Premium UI and Step 74

- Redesigned the workspace shell, dashboard, authentication and management pages. Shared CSS tokens cover both themes. Lucide React 1.81.0 supplies the icons, and the login uses an original 29 KB equipment illustration. See [the UI guide](UI_DESIGN.md) for the components, attribution and screenshot filenames.
- Made form labels stable when error messages appear and kept login submission on POST after hydration. Workspace session reads use the current Next.js cookie store during password rotation.
- Tested the production build with fictional records in a separate PostgreSQL 17 container on a different loopback port. The test database used temporary storage and a read-only schema copy. The existing development database and volume remained in use with their original records.
- TypeScript, ESLint, Prisma 7.10.1 validation, and Next.js 16.4.6 production build exited 0. `npm test` reported 12 passed, 0 failed and 0 skipped with both the PostgreSQL integration and local HTTP suites enabled. Checks included concurrent issuing, the unique open-assignment constraint, protected routes, role enforcement, session revocation and CSV formula escaping.
- Headless Chromium passed sign-in with valid and invalid credentials, session persistence, sign-out, role-based routes, profile and password updates, and other-session revocation. It verified inventory creation, editing, duplicate rejection, search, filtering, sorting, pagination, archival, issuing, a damaged return, assignment history, and live changes to the dashboard counts.
- Browser checks also verified category, location, employee and user creation, the eight report views and exports, a filtered CSV, and audit events. Workspace pages had no horizontal page overflow at 375, 768, 1366 and 1920 pixels. Theme and sidebar preferences persisted, and Escape dismissed the mobile drawer.
- The disposable container was removed. The main database remained healthy on `openasset_openasset-db`. An authenticated read-only check confirmed 12 assets, 3 assignments, 1 user, 2 migrations and zero browser QA assets. The persistent backup passed SHA-256 verification.
- Browser automation covered Chromium. Firefox, Safari, assistive technology and deployment infrastructure remain unverified. Use the README browser checklist if validating those environments.

## Development runtime repair · 2026-11-27

- Port 3000 was served by Next.js 16.4.3 while the installed package and lockfile specified 16.4.6. The old server log showed ``Unknown argument `archivedAt` `` in `employee.findMany()`. Its loaded Prisma client still used the Employee model from before the lifecycle migration. Prisma 7.10.1 validated the current schema, and `prisma migrate status` confirmed both migrations were applied. A read-only query with the regenerated client returned five eligible employees from the main database.
- The old browser log reported the negative `Performance.measure()` timestamp for `AssignmentsPage [Prerender]` immediately after the Prisma rejection. The call comes from development React Server Components timing code for errored renders. Both errors disappeared on the clean server. The employee archive filter and location relation matched the current schema.
- Stopped the old server and moved the ignored `.next/dev` output and historical log to `/tmp/openasset-old-dev.dx83FAQd/dev`. Regenerated Prisma Client and added `predev` in `package.json` so `npm run dev` generates it before starting. `assignment-search.ts` now shares the exact employee query between the page and the PostgreSQL regression test, which checks the location select and the exclusion of archived employees.
- On a disposable database, authenticated Chromium loaded Dashboard, Assets, Assignments, Employees, Register asset and Reports. It passed three Assets and Assignments round trips, navigation from asset details to assignment history, and a hard reload, with zero uncaught browser errors. TypeScript, ESLint, the production build and all 12 tests passed with zero skips. The regular server now runs Next.js 16.4.6 on `127.0.0.1:3000` and serves `/login` with HTTP 200.

## Step 81G · GitHub Actions CI

- Added CI for pull requests into `main` and pushes to `main` or `feature/**`. The workflow uses Node.js 24, read-only repository permissions, pinned actions, and a fresh PostgreSQL 17 service. Its test database and HTTP server use loopback, and the job generates a temporary auth secret at runtime.
- Rehearsed the CI commands from a clean temporary checkout. `npm ci`, Prisma Client generation and schema validation, Next.js route type generation, TypeScript, ESLint, and the production build passed. Both reviewed migrations applied to a fresh disposable database, and all 12 tests passed with zero skips. The existing local database was untouched.
- `actionlint` verified the workflow syntax. The hosted run on PR #2 is pending the workflow push. A separate `npm audit --omit=dev` reported three high-severity entries (`@prisma/config`, `effect`, and `prisma`) in the existing dependency tree. Review those advisories before deployment.

## Step 81J · Effect dependency remediation

- Added an npm override limited to `@prisma/config@7.10.1` and changed only the Effect entry in the lockfile. A clean `npm ci` resolved `effect@3.22.1`. Prisma CLI, Client, config, and adapter stayed at `7.10.1`. The original three high audit entries shared one Effect advisory. [Effect advisory](https://github.com/Effect-TS/effect/security/advisories/GHSA-7589-6fvf-x4pw)
- `npm audit --omit=dev` returned zero vulnerabilities. Full `npm audit` exited 1 with seven moderate entries in the ESLint dependency tree from the `minimatch` advisory, with zero high or critical entries. These findings require a separate development dependency review.
- Prisma generation and validation, TypeScript, ESLint, and the production build passed from the clean install. Both migrations applied on a fresh disposable PostgreSQL 17 instance. All 12 tests passed with zero skips, including authentication, bootstrap, permissions, inventory, and concurrent issue and return coverage. An authenticated HTTP smoke test also passed for sign-in, the secure session cookie, Dashboard, Assets, and assignment history. The main database was untouched.
