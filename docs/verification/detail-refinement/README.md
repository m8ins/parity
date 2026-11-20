# Detail refinement · 20 November 2026

Branch: `codex/refine-meter-details`.

Follow-up: removed the extra “Name ändern” action from management. The view switch aligns right above chart/table, sharing a desktop row with the legend. The chart legend hides in monthly view; narrow screens wrap the toolbar.

Implements the reviewed detail header, inline meter-name editing, quieter navigation, unframed all-meter reading history, aligned conditions with fixed two-decimal euro formatting, separated management actions, and the chart/monthly view switch. Calculation logic and persisted numeric precision are unchanged.

## Validation

- `npm test -- --run`: 192 tests passed across 28 files. Updated interaction coverage includes inline selection/save/failure/Escape/pending, contextual period-end access, full reading history, chart/monthly switching, and scoped unavailable-RPC errors.
- `npx tsc --noEmit` and `npm run lint -- --fix` pass.
- `node docs/verification/detail-refinement/verify-browser.mjs`: real Chromium rendering of the isolated synthetic preview at 1440, 1024, 768, 390 and 320 CSS px, plus 320 px with 200% text and expanded letter/word/line spacing. Panel switching, editor focus, readable values and management separation checked; no document overflow or page errors. Screenshots and `browser.json` are adjacent.
- `node docs/verification/detail-refinement/verify-database.mjs`: real local PostgreSQL restoration from an absent RPC, session/owner enforcement, confirmed normalized row, safe identical retry, stale-snapshot rejection, protected condition boundaries and denial of foreign writes. Entire transaction rolled back, including synthetic accounts and function replacement. See `database.json`.
- Production build passes and is performed in a temporary copy via `node docs/verification/slice-6/build-isolated.mjs`, preserving the working development server. Synthetic local configuration is used; this does not validate deployment credentials.

Browser checks use synthetic fixtures, not household data. Physical Safari/iOS and screen-reader acceptance remain unverified. Existing changes to design tokens, shared controls and the chart were present before this branch and were preserved.

## Confirmed production issue and release step

The public deployment `https://parity-two.vercel.app` loads successfully. An unauthenticated request with a nonexistent all-zero period ID to its publicly configured Supabase API returns:

```json
{"rpcStatus":404,"code":"PGRST202","message":"Could not find the function public.save_billing_period_details(p_expected, p_period_id, p_provider, p_start) in the schema cache"}
```

No account was used and no production rows were changed. This establishes that the API cannot resolve the function; it does not establish whether the underlying cause is missing migration history or stale schema metadata. The UI now preserves the edit and explains temporary unavailability beside the form, without leaking that error into other tabs.

Before releasing, apply **all pending migrations in order**, including `20261119000002_write_integrity.sql` and `20261120000001_restore_period_details_rpc.sql`. The latter restores the existing ownership/concurrency-checked implementation and notifies PostgREST to reload its schema. It is additive and safe after the earlier definition; no fallback bypasses the RPC or its checks. Production migration history and successful authenticated production saves still need verification after deployment. No production migrations were applied in this task.
