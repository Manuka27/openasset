# OpenAsset

OpenAsset is a Next.js application for tracking IT assets, employee assignments, inventory reports and audit history. It uses PostgreSQL 17, Prisma 7, and Better Auth.

## Local setup

1. Install the locked dependencies with `npm ci`.
2. Create a private `.env` from `.env.example`. Set a unique PostgreSQL password with a matching URL-encoded password in `DATABASE_URL`. Generate a Better Auth secret of at least 32 characters. Use `BETTER_AUTH_URL=http://localhost:3000` for local development.
3. Start PostgreSQL with `docker compose up -d db` and wait for `docker compose ps` to show healthy.
4. Run `npx prisma generate`. Review pending migrations and apply only the approved changes using `npx prisma migrate deploy`. An existing development database needs the employee and assignment lifecycle migration for the new employee and assignment screens.
5. Run `npm run dev`. Open [OpenAsset login](http://localhost:3000/login).

Use the development administrator already provisioned for the local database. Keep the password private. For a new isolated development database, the fictional seed is an explicit opt-in. Set a unique admin password in the seed process environment and run `NODE_ENV=development OPENASSET_DEMO_SEED=true npx prisma db seed` only after approving the target database.

## Checks

```sh
npm run lint -- --no-cache
npx next typegen
npx tsc --noEmit --incremental false
npx prisma validate
npm test
npm run build
```

The integration suite writes fictional records only to a separate loopback database named `openasset_test` or `openasset_test_<suffix>`. Use a fresh migrated test database with an empty user table so the suite can test the first-admin bootstrap. The suite leaves its fixtures in that disposable database.

## Browser verification

- Sign in from `/login`, check the dashboard counts against inventory, and open an asset. Verify search, status and location filters, sorting and pagination.
- In an isolated test environment, create and edit an asset, issue it to an active employee, attempt a second issue, then record a return. Check the history and archive the returned asset.
- As Admin, verify category, location, employee and user management and audit logs. As IT Staff, check assignments and reports and verify that direct links to administrative pages return to the dashboard.
- Export a report and verify its filters. Update your test profile, change its password and sign out.

Read the [project context](docs/PROJECT_CONTEXT.md), [development progress](docs/DEVELOPMENT_PROGRESS.md), [architecture](docs/ARCHITECTURE.md), [implementation walkthrough](docs/IMPLEMENTATION_WALKTHROUGH.md) and [UI guide](docs/UI_DESIGN.md).
