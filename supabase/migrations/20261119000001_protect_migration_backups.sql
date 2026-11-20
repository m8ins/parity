-- Historical migration snapshots are independent of today's meter cascades.
-- Restrict client access without inspecting, rewriting or deleting any rows.
ALTER TABLE public.contracts_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_prices_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payments_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contracts_backup, public.readings_backup,
  public.contract_prices_backup, public.contract_payments_backup FROM PUBLIC, anon, authenticated;
-- Retention/removal remains a separate product decision (Slice 7).
