-- Run separately after receipt/write hardening. Never discard legacy duplicates.
BEGIN;
LOCK TABLE public.rates IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rates GROUP BY contract_id, effective_from HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Altdubletten in rates: Eindeutigkeit NICHT installiert. Kontrollierte Bereinigung und erneuten Rollout erforderlich.' USING ERRCODE = '23505';
  END IF;
END $$;
ALTER TABLE public.rates ADD CONSTRAINT rates_contract_effective_unique UNIQUE (contract_id, effective_from);
COMMIT;
