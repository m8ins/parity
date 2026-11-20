-- Restore the details RPC on installations where it is absent from the API schema.
-- Safe after the existing write-integrity migration; preserve its authorization
-- and conflict checks. Apply all pending migrations in order before deploying UI.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_billing_period_details(p_period_id uuid, p_expected jsonb, p_start date, p_provider text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE period public.contracts%ROWTYPE; target_provider text := NULLIF(btrim(p_provider), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  PERFORM 1 FROM public.meters m JOIN public.contracts c ON c.meter_id=m.id
    WHERE c.id=p_period_id AND m.user_id=auth.uid() FOR UPDATE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  SELECT * INTO period FROM public.contracts WHERE id=p_period_id FOR UPDATE;
  IF p_start IS NULL OR NOT isfinite(p_start) OR (period.period_end IS NOT NULL AND p_start >= period.period_end) THEN
    RAISE EXCEPTION 'Ungültiger Beginn' USING ERRCODE = '22023';
  END IF;
  IF period.period_start IS NOT DISTINCT FROM p_start AND period.provider IS NOT DISTINCT FROM target_provider THEN RETURN to_jsonb(period); END IF;
  IF p_expected IS DISTINCT FROM jsonb_build_object('period_start',period.period_start,'period_end',period.period_end,'provider',period.provider) THEN
    RAISE EXCEPTION 'Zeitraum wurde inzwischen geändert. Bitte neu laden.' USING ERRCODE = '40001';
  END IF;
  IF p_start > period.period_start AND (EXISTS (SELECT 1 FROM public.rates WHERE contract_id=period.id AND effective_from < p_start)
    OR period.settlement_date < p_start) THEN
    RAISE EXCEPTION 'Der Beginn würde bestehende Konditionen oder die Abrechnung ausschließen' USING ERRCODE = '22023';
  END IF;
  UPDATE public.contracts SET period_start=p_start, provider=target_provider WHERE id=period.id RETURNING * INTO period;
  RETURN to_jsonb(period);
END;
$$;
REVOKE ALL ON FUNCTION public.save_billing_period_details(uuid,jsonb,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_billing_period_details(uuid,jsonb,date,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
