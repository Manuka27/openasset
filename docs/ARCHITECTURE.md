# OpenAsset architecture

OpenAsset uses the Next.js App Router for pages and HTTP handlers, React for the interface, and Prisma 7 with the PostgreSQL adapter for database access. Docker Compose runs PostgreSQL 17 for development.

## Application boundaries

| Area | Files and responsibilities |
| --- | --- |
| Routing | `src/app/(workspace)` contains authenticated pages. `src/app/login` hosts sign-in. Routes remain short and render the data their screen needs. |
| Authentication | `src/lib/auth.ts` configures Better Auth and database sessions. `src/lib/session.ts` reads the session and verifies the current role from PostgreSQL. The public auth handler accepts sign-in and sign-out only. |
| Writes | `src/app/(workspace)/actions.ts` authenticates the request, validates form data with Zod, and calls services. It returns field feedback and refreshes the current view. |
| Business logic | `src/lib/inventory.ts` and `src/lib/users.ts` control permissions, writes, and audit events. Assignment status changes and audit inserts share a serializable transaction with bounded retries. |
| Reads and export | `asset-search.ts`, `assignment-search.ts`, and `reports.ts` translate allowed URL filters to Prisma. The report handler checks the session before returning a private CSV response and escapes formula-like cells. |
| UI | `WorkspaceShell` handles navigation and interaction. The server layout supplies role-filtered access and server-rendered page content. `WorkspacePreferences` stores only theme and sidebar state in local browser storage. |
| Design system | `globals.css`, `WorkspaceUI`, `StatCard`, `InventoryCharts`, `ListControls`, and `ActionForm` provide shared visual and accessibility patterns. Dashboard counts and charts render on the server. |
| Data | Prisma defines the existing 11 tables. The second migration adds nullable employee IDs, department, archive date, and return condition, plus unique and lookup indexes. |

## Access rules

| Operation | Admin | IT Staff |
| --- | --- | --- |
| View dashboard, assets, assignments and reports | Yes | Yes |
| Issue and return assets | Yes | Yes |
| Register, edit and archive assets | Yes | |
| Manage categories, locations, employees and users | Yes | |
| View the audit log | Yes | |
| Update own name and change own password | Yes | Yes |

Assignment actions enforce employee and location eligibility. An atomic status update and the PostgreSQL partial unique index protect against concurrent open assignments for the same asset. Returning an item preserves the assignment row. Items returned in good condition become available. Damaged items and items that need service move to maintenance. Category, location and employee archival preserves historical references and checks for active dependencies.

Administrative creation uses Better Auth-compatible hashing and account linkage inside a transaction. Login submits credentials over POST after the form hydrates. Password changes use Better Auth's authenticated password API and revoke other sessions. Workspace rendering reads the updated Next.js cookie store when a server action rotates the current session. Audit queries select actor, action, entity and time without fetching raw metadata. Dashboard activity is limited to inventory events.

## Deployment boundary

Compose binds PostgreSQL to loopback for development. Use a dedicated least-privilege database account, TLS, protected secret storage and database backups in a production environment. Apply reviewed migrations as a separate release step. The repository's development seed and demo administrator credentials belong in local development only.

See [the UI guide](UI_DESIGN.md) for design tokens, screenshots and asset provenance. Browser QA uses a separate loopback server and disposable PostgreSQL instance with fictional fixtures. It copies schema metadata from the main database through a read-only connection.
