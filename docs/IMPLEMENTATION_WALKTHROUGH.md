# OpenAsset implementation walkthrough

Use this guide with the running application and the linked source paths. The order follows the way a user signs in, reads inventory, and makes a change.

1. **React and props.** Open `src/components/StatCard.tsx`. The dashboard provides a title, value and color as props. In Power Apps terms, props are like input properties on a reusable component. එකම component එකට වෙනස් අගයන් දීලා cards කිහිපයක් හදනවා.
2. **Next.js routing.** Each workspace `page.tsx` is a screen. The `(workspace)` route group shares an authenticated layout without adding to the URL. Think of the layout as the shared navigation and authentication around a set of Power Apps screens.
3. **TypeScript and validation.** TypeScript checks that code agrees about data shapes during development. Zod checks what a real request sends at runtime. බලන්න `src/lib/validation.ts` තුළ Asset ID සහ warranty validation.
4. **Frontend and backend.** `ActionForm` collects values and shows feedback. A Server Action checks the session, validates input and calls a service. It is comparable to a Power Apps button invoking a server-side flow. A route handler provides the HTTP interface for auth and CSV download.
5. **Prisma and PostgreSQL.** `prisma/schema.prisma` describes storage and relationships. Prisma translates typed queries into SQL. PostgreSQL persists the records, foreign keys and indexes. A migration is a reviewed version of the database schema change.
6. **Authentication and roles.** Better Auth verifies credentials and creates an HttpOnly session cookie. Server code fetches the current database role. Think of an Admin editing a directory as a write permission checked by the service, even when a caller reaches the action directly.
7. **Transactions.** Issuing changes asset status, writes a history row and records an audit event together. A transaction applies all changes or rolls them back. එක පියවරක් අසාර්ථක වුණොත් ඉතිරි database වෙනස්කම් ද ආපසු හැරෙනවා.
8. **Docker.** `docker compose up -d db` starts a local PostgreSQL service. The named volume holds its data across container restarts.
9. **Testing.** Run `npm test`, lint and TypeScript. The isolated database suite covers Prisma interactions and concurrent issuing when the test schema is ready. Use the browser checklist in the README for real sign-in and navigation.
10. **Git and deployment.** Review working-tree changes and the migration separately. Sample a production build with `npm run build` before release. Apply approved migrations and run the built server with production-specific secrets and database roles. The deployment itself happens only after approval.

## Premium UI lesson

Start with `WorkspaceShell.tsx` and `globals.css`. The shell is like a shared Power Apps screen template. The CSS tokens serve a similar purpose to a theme record. Changing one surface or accent token updates every component that uses it. Theme එක වෙනස් කළාම records වෙනස් වෙන්නේ නැහැ. Browser එකේ preference එක විතරක් save වෙනවා.

Next, trace one number from `dashboard/page.tsx` to `StatCard.tsx` and `InventoryCharts.tsx`. The server groups real assets by status, then passes those counts as props. The chart has a text legend with the same values, so the colors are an extra cue. See [the UI guide](UI_DESIGN.md) for responsive checks and artwork provenance.

For a practical exercise, start `npm run dev`, open `/login` and sign in privately. Compare one dashboard count with the inventory page it opens. Step 74 used fictional data in disposable PostgreSQL for actions that change records. The [development progress](DEVELOPMENT_PROGRESS.md) records the verified workflows.
