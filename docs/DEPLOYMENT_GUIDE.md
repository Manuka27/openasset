# OpenAsset deployment guide

Steps 79–80 · Deployment audit and preparation on 2026-11-27

## 1. What is ready

| Area | Finding |
| --- | --- |
| Git and GitHub | The application release is on `feature/dashboard-data` in PR #2 into `main`. The CI workflow should pass on the PR before merging an approved commit for Railway. |
| Next.js | Next.js 16.4.6 uses `next build` and `next start`. Cache Components, partial prefetching and the Tailwind Turbopack loader are configured. Step 80 passed a production build without database or auth credentials, a start check on an assigned `PORT`, and all 12 tests on disposable PostgreSQL. Railway is the next environment to verify. |
| Prisma | Prisma 7.10.1 generates into the Git-ignored `src/generated/prisma`. Both `npm run dev` and `npm run build` generate it before compiling. The two reviewed migrations create the application schema and add employee and assignment lifecycle fields and indexes. |
| PostgreSQL | The app uses Prisma's PostgreSQL adapter. Railway web and migration processes need a reachable database with the migrated `public` schema. WSL's Compose service and loopback URL are for local development. |
| Authentication | The public API accepts sign-in and sign-out. Use the private `npm run admin:bootstrap` command to create the first administrator after migrating an empty Railway database. |
| Secrets | The private `.env` is ignored and untracked. A filename check found no tracked environment files, private-key files or dumps among the inspected local Git history paths. A narrow working-tree check found no common private-key, GitHub token or AWS access-key signatures. Review staged content before publishing, including other kinds of secrets. |

Think of GitHub as the versioned solution, Railway as the hosted app environment, and PostgreSQL as the separate data store. Power Apps solution එක deploy කළා වගේ, GitHub එකෙන් code version එක Railway වෙත යනවා. Database එකට වෙනම connection එකක් තියෙනවා.

## 2. Prepare GitHub after approval

- [ ] Run `git status --short --branch`, `git diff`, and `git ls-files --others --exclude-standard`. Review the new source, `package-lock.json`, `prisma.config.ts`, `prisma/schema.prisma`, both migration directories, static assets, tests, and docs.
- [ ] Confirm `git check-ignore .env .env.production src/generated/prisma/client.ts` and `git ls-files -- .env '.env.*'`. The sample `.env.example` uses local placeholders. Keep dumps, private keys, provider credentials and diagnostic logs outside the repository. The ignore rules cover common dump and key extensions, local tool state, and `backups/`. Reviewed Prisma migration SQL remains eligible to commit.
- [ ] After reviewing the files and having approval to stage them, use the allowlist below. Review the staged file list and run a secret scan before committing. Ignore rules can be bypassed by force-adding files. If you discover a real secret in a published commit, rotate it and handle history cleanup separately.

  ```sh
  git add -- .gitignore .env.example AGENTS.md README.md compose.yaml package.json package-lock.json prisma.config.ts railway.toml docs prisma public/openasset-equipment.webp scripts/bootstrap-admin.ts src tests
  git diff --cached --name-status
  git diff --cached --check
  git diff --cached
  git commit -m "Prepare OpenAsset for Railway deployment"
  ```

- [ ] Push the reviewed branch with `git push -u origin feature/dashboard-data`. Open a pull request into `main` and review the file list and checks. After approval, merge the PR and note the commit SHA Railway should deploy. A separate reviewed branch can serve as a staging deployment source.

### CI on pull requests

The [CI workflow](../.github/workflows/ci.yml) runs for pull requests into `main` and pushes to `main` or `feature/**`. In PR #2, open **Checks** and wait for **CI / Checks** to pass before merging. The job uses Node.js 24, runs the clean install and build, then applies the reviewed migrations to a new PostgreSQL 17 service named `openasset_test`. It starts the app on the runner's loopback interface and runs the HTTP and database tests with disposable credentials. GitHub removes the service when the job ends. [GitHub PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

## 3. Create the Railway services after approval

1. Sign in to Railway and connect GitHub. Grant the Railway GitHub integration access to `Manuka27/openasset`.
2. Create a Railway project or a separate staging environment for the rehearsal. On the canvas, choose **New → Database → PostgreSQL**. Keep the database private and verify its persistent volume. Prefer the same PostgreSQL major version as local development, 17, or rehearse with the exact version Railway provisions.
3. Add a GitHub Repository service and select `Manuka27/openasset`. Choose **Add variables** when prompted so you can configure the first deployment. In service settings, choose the reviewed trigger branch and keep the repository root as the app root. Use Railpack. For production, connect the approved `main` branch and verify the intended SHA. Keep staging and production on separate PostgreSQL services with separate secrets. [Railway quick start](https://docs.railway.com/quick-start) · [PostgreSQL service](https://docs.railway.com/databases/postgresql) · [GitHub deployment settings](https://docs.railway.com/deployments/github-autodeploys)
4. Under **Settings → Networking → Public Networking**, generate a domain for the web service when authorized to expose it. Use that HTTPS origin in the web service variables. Keep the database on Railway's private network. [Railway domains](https://docs.railway.com/networking/domains/working-with-domains)

### Web service variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` if the database service is called `Postgres`. Use Railway's reference picker for a different service name. Verify the reference resolves to the private database in this environment. Use the direct PostgreSQL connection for migrations. Preserve the provider's TLS settings and verify them in staging. |
| `BETTER_AUTH_URL` | The exact canonical HTTPS origin, such as `https://openasset-staging.up.railway.app`. Use the production domain in production, with no path. |
| `BETTER_AUTH_SECRET` | A unique server-side secret for each environment. Run `openssl rand -hex 32` privately and paste the result directly into Railway Variables. Keep it stable across deploys and replicas. Use no `NEXT_PUBLIC_` prefix for database or auth secrets. |
| `RAILPACK_NODE_VERSION` | `24` selects the Node 24 line tested locally and supported by Prisma 7. Verify the resolved version in build logs. |
| `RAILPACK_NODE_NPM_INSTALL` | `npm ci --include=dev` explicitly installs from the lockfile with the build tools. Leave `NODE_ENV` unset as a manual service override so Railpack and Next.js can manage their install and runtime phases. |
| `PORT` | Railway supplies it. The `next start` command below reads it. |
| `OPENASSET_DEMO_SEED` | Leave unset or set `false`. Leave demo passwords, `TEST_DATABASE_URL`, `OPENASSET_TEST_URL`, and local Compose variables out of the web service. |

OpenAsset requires a single canonical HTTPS origin in production and enables secure cookies. Better Auth trusts that origin by default. Leave `BETTER_AUTH_TRUSTED_ORIGINS` unset. Sessions use the PostgreSQL adapter and expire after 24 hours, with the existing one-hour update interval. [Better Auth security](https://better-auth.com/docs/reference/security) · [Railway variable reference](https://docs.railway.com/variables/reference) · [Railpack Node settings](https://railpack.com/languages/node/) · [Prisma runtime requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements)

### Build, migrate and start

Railway reads these settings from `railway.toml` at the repository root.

| Railway setting | Value |
| --- | --- |
| Build command | `npm run build` runs `prisma generate` through `prebuild` and then runs `next build`. |
| Pre-deploy command | `npm run db:migrate` runs `prisma migrate deploy`. |
| Start command | `npm start` runs `next start --hostname 0.0.0.0` on Railway's `PORT`. |
| Healthcheck path | `/login` for the first rehearsal. It checks that Next.js serves the page. Verify database and auth separately after deployment. |

The build generates code from the schema. The pre-deploy command applies the checked-in migrations from inside Railway's private network and blocks the release if it fails. The PostgreSQL role used by pre-deploy must be able to create and alter the schema objects. OpenAsset currently reads the same `DATABASE_URL` for migrations and app traffic. Before a production release, plan separate migration and least-privilege runtime credentials and verify that both connection paths work. Railway starts the web server after pre-deploy succeeds. [Build and start settings](https://docs.railway.com/builds/build-and-start-commands) · [Pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command) · [Healthchecks](https://docs.railway.com/deployments/healthchecks)

## 4. First admin and first deployment

- [ ] The demo seed requires explicit opt-in, `NODE_ENV=development`, and a loopback `openasset` database. The demo admin is `admin@openasset.example`, and its password is supplied privately and hashed. Leave public signup disabled, use a new named hosted administrator and unique password, and start the Railway database empty of local demo data.
- [ ] Click **Deploy** only after approving the settings and migrations for the selected environment. Follow the build logs for Prisma generation and the Next.js build. Check the deployment logs for migration success and HTTP health. If migration fails, inspect the error and target before retrying. Keep `prisma db push`, `prisma migrate dev`, resets and demo seeding out of deployment commands.
- [ ] After the approved deployment and migration, open a private interactive shell from the linked Railway project using `railway ssh --service <web-service> --environment <environment>`. Register your SSH key if Railway prompts for it. From the deployed app directory, run `npm run admin:bootstrap`. Type the displayed private hostname and database to confirm the target, then enter the first admin's name, email and password. Both password prompts are hidden. Use a unique password from your password manager and enter it only in the terminal. [Railway SSH](https://docs.railway.com/cli/ssh)
- [ ] The command requires a private Railway database URL and an empty user table. It stores a Better Auth password hash and credential in the same serializable transaction as the administrator. Concurrent and repeated runs are rejected after the first success. Use the authenticated Users screen for future accounts.
- [ ] Confirm `/login` serves over HTTPS and anonymous requests to `/dashboard` and `/assets` go to login. After running the approved private bootstrap, sign in, reload to confirm the session, open Assets and Assignments, and sign out. In staging, exercise issue and return, role restrictions, and CSV export with fictional test records. Check that both migrations show as applied with `npx --no-install prisma migrate status` from a session with the Railway private database configuration.

## 5. Backups, recovery and later updates

- [ ] In the PostgreSQL service **Backups** tab, enable a schedule appropriate to how much recent data you can afford to lose. Verify the plan and retention before relying on it. Take a manual backup before risky migrations. For an independent copy, use `pg_dump --format=custom` from an authorized client with private connectivity and credentials. Store it encrypted outside Git and verify a restore into a separate database. The verified WSL backup covers the local database. Railway needs its own backups. [Railway volume backups](https://docs.railway.com/volumes/backups) · [Point-in-time recovery](https://docs.railway.com/volumes/point-in-time-recovery)
- [ ] Rehearse restoring to a separate environment, check record counts and migration history, then test sign-in and core workflows. A Railway app rollback changes the deployed app version. PostgreSQL schema and records need a separate recovery plan. Prefer compatible migrations so the previous app version can run while a release is repaired. [Railway rollback](https://docs.railway.com/deployments/deployment-actions)
- [ ] For each update, open a feature branch and pull request, run the local checks from the README, and confirm **CI / Checks** passes. Deploy the reviewed commit to staging. Review any new migration and the backup before production. With autodeploy disabled, use **Deploy Latest Commit** after approval. If you later enable autodeploy, select `main` and enable **Wait for CI**. The workflow already runs on pushes to `main`. Review deployment logs and repeat the smoke checks after each release. [Railway autodeploy and Wait for CI](https://docs.railway.com/deployments/github-autodeploys)

The next checkpoint is to review the CI run on PR #2 after the workflow is pushed with approval. A later staging deployment can verify the Railway image, private database connection, and hosted authentication before production.
