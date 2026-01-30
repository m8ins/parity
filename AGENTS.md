# Repository Guidelines

## Project Structure & Module Organization
Parity is a Next.js 16 App Router app. Pages, layouts, and global styles live in `src/app` (with `contract/` handling contract flows and shared `layout.tsx`/`globals.css`). UI primitives and composed screens sit inside `src/components` (shadcn parts in `ui/`), while calculation and date helpers live in `src/lib`; import both through the `@/` alias configured in `tsconfig.json`. Static assets belong in `public/`. Supabase migrations, seeds, and CLI config are under `supabase/` and must evolve alongside schema changes.

## Build, Test, and Development Commands
- `npm run dev`: hot-reload dev server on :3000.
- `npm run build`: production build, required before release PRs.
- `npm start`: run built assets for smoke tests.
- `npm run lint`: Next core-web-vitals ESLint rules across `src/`.
- `npm test`: Vitest + Testing Library suite (jsdom, globals enabled).

## Coding Style & Naming Conventions
Stick to TypeScript files; avoid stray `.js` in `src`. Components/hooks use PascalCase file names (`Dashboard.tsx`, `useBilling.ts`). Follow the project’s 2-space indentation (see `src/app/page.tsx`), descriptive prop names, and concise Tailwind class lists. Prefer composition through `src/components/ui/*` exports rather than re-styling raw primitives. Run `npm run lint -- --fix` before pushing; there is no Prettier, so rely on ESLint and editor formatting.

## Testing Guidelines
Tests live beside the code: utilities as `*.test.ts` next to the source and components under `src/components/__tests__/*.test.tsx`. Use Vitest `describe/it` with behavior-focused names (`it('blocks future readings')`). Cover contract creation, reading dialogs, and calculator helpers whenever edited, and expand snapshots/assertions when UI state changes. Execute `npm test` locally; add `--runInBand` when reproducing flaky DOM specs. Include screenshots or logs in the PR when a regression fix touches the UI.

## Commit & Pull Request Guidelines
Commits are short, imperative, and scoped (`feat: add validation…`, `Adds password-based login`). Reference issue IDs where possible and keep config plus schema changes isolated. PRs must explain motivation, list commands run (`npm test`, `supabase db reset`), and attach screenshots for UI-facing work. Mention related Supabase migration/seed files so reviewers know what to apply.

## Supabase & Local Data Setup
Create `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Start local services with `supabase start`, then `supabase db reset` to apply migrations and run `supabase/seed.sql`—replace the placeholder UUID in that file with your test user before seeding. Keep seed data aligned with new dashboard flows so features can be reproduced locally.
