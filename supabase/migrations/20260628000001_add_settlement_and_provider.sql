-- Migration: Add final settlement + per-period provider to contracts
-- Prepares the rolling contract-year model:
--   * settlement_amount / settlement_date capture the actual Schlussabrechnung
--     once a billing period is over (forecast lives only in the app).
--   * provider records which energy supplier ran the meter in each period
--     (e.g. e.on 2024, Vattenfall 2025/26). This column existed before the
--     meter-centric migration (20260606000001) and is re-added here, now
--     correctly scoped to the billing period instead of the meter.
-- All columns are nullable and additive; existing RLS on contracts (via the
-- meter FK) already covers them, so no policy changes are required.

ALTER TABLE public.contracts
  ADD COLUMN settlement_amount numeric, -- signed €: >= 0 = Erstattung, < 0 = Nachzahlung (same sign as calc `difference`)
  ADD COLUMN settlement_date   date,
  ADD COLUMN provider          text;
