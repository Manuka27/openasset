<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## OpenAsset project rules

- At the start of each session, read [the project context](docs/PROJECT_CONTEXT.md) before doing development work. Use it to pick up from the recorded next action.
- OpenAsset is an open-source Asset and Inventory Management System built with Next.js, React, TypeScript, and Tailwind CSS.
- Use reusable components and clean architecture.
- Follow a step-by-step full-stack development roadmap.
- Preserve existing code and uncommitted changes. Inspect existing files before adding features.
- Use PostgreSQL for future database development.
- Implement small, testable changes. Run lint and TypeScript checks after code changes.
- Never commit, push, merge, or deploy without the user's approval.
- Summarize key changes in simple English in five lines or fewer. Minimize token use and omit unnecessary explanations.
