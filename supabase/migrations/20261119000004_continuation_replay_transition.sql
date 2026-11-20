-- Fail closed for legacy continuation requests whose receipts were already lost.
BEGIN;
CREATE OR REPLACE FUNCTION public.continue_billing_period(p_request_id uuid, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid();
  period public.contracts%ROWTYPE;
  next_period public.contracts%ROWTYPE;
  receipt public.billing_continuation_requests%ROWTYPE;
  periods_snapshot jsonb;
  rates_snapshot jsonb;
  starts date;
  ends date;
  base numeric;
  price numeric;
  payment numeric;
  factor numeric;
  kind text;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'Ungültiger Auftrag' USING ERRCODE = '22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text || p_request_id::text, 5));
  PERFORM 1 FROM public.meters m JOIN public.contracts c ON c.meter_id = m.id
    WHERE c.id = (p_payload->>'period_id')::uuid AND m.user_id = account_id FOR UPDATE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  SELECT * INTO period FROM public.contracts WHERE id = (p_payload->>'period_id')::uuid FOR UPDATE;
  SELECT * INTO receipt FROM public.billing_continuation_requests WHERE user_id = account_id AND request_id = p_request_id;
  IF FOUND THEN
    IF (receipt.comparison_version = 0 AND receipt.payload IS DISTINCT FROM p_payload)
      OR (receipt.comparison_version = 1 AND receipt.fingerprint IS DISTINCT FROM public.request_fingerprint_v1(p_payload)) THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben verwendet' USING ERRCODE = '22023'; END IF;
    IF receipt.period_id IS NULL THEN RAISE EXCEPTION 'Folgezeitraum wurde gelöscht' USING ERRCODE = '40001'; END IF;
    SELECT * INTO next_period FROM public.contracts WHERE id = receipt.period_id AND meter_id = period.meter_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Folgezeitraum nicht mehr verfügbar' USING ERRCODE = '40001'; END IF;
  ELSE
    -- Old clients must not recreate an outcome whose pre-upgrade receipt was
    -- already cascaded away. Existing receipts above remain exactly replayable.
    IF p_payload->'continuation_version' IS DISTINCT FROM '1'::jsonb THEN
      RAISE EXCEPTION 'Alter Auftrag ohne Beleg. Bitte aktuellen Stand laden und Fortführung erneut prüfen.' USING ERRCODE = '40001';
    END IF;
    PERFORM 1 FROM public.contracts WHERE meter_id = period.meter_id ORDER BY id FOR UPDATE;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(period.id::text, 4));
    PERFORM 1 FROM public.rates WHERE contract_id = period.id ORDER BY id FOR UPDATE;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'period_start',period_start,'period_end',period_end,'provider',provider,'settlement_amount',settlement_amount,'settlement_date',settlement_date) ORDER BY id),'[]'::jsonb)
      INTO periods_snapshot FROM public.contracts WHERE meter_id = period.meter_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'effective_from',effective_from,'grundpreis',grundpreis,'arbeitspreis',arbeitspreis,'abschlag',abschlag,'umrechnungsfaktor',umrechnungsfaktor) ORDER BY id),'[]'::jsonb)
      INTO rates_snapshot FROM public.rates WHERE contract_id = period.id;
    IF p_payload->'expected_periods' IS DISTINCT FROM periods_snapshot OR p_payload->'expected_rates' IS DISTINCT FROM rates_snapshot THEN
      RAISE EXCEPTION 'Zeiträume oder Konditionen wurden inzwischen geändert. Bitte neu laden und prüfen.' USING ERRCODE = '40001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.contracts WHERE meter_id = period.meter_id AND id <> period.id AND period_start >= period.period_start) THEN
      RAISE EXCEPTION 'Nur der neueste Zeitraum kann fortgeführt werden' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(p_payload->>'period_start','') !~ '^\d{4}-\d{2}-\d{2}$' OR (p_payload->>'period_end' IS NOT NULL AND p_payload->>'period_end' !~ '^\d{4}-\d{2}-\d{2}$') THEN
      RAISE EXCEPTION 'Ungültiges Datum' USING ERRCODE = '22023';
    END IF;
    starts := (p_payload->>'period_start')::date; ends := (p_payload->>'period_end')::date;
    IF NOT isfinite(starts) OR starts <= period.period_start OR (ends IS NOT NULL AND (NOT isfinite(ends) OR ends <= starts)) THEN RAISE EXCEPTION 'Ungültige Zeitraumgrenzen' USING ERRCODE = '22023'; END IF;
    IF (period.period_end IS NULL OR starts < period.period_end) AND (p_payload->>'confirm_boundary')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Grenzänderung ausdrücklich bestätigen' USING ERRCODE = '22023'; END IF;
    IF period.period_end IS NOT NULL AND starts > period.period_end AND (p_payload->>'confirm_gap')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Lücke ausdrücklich bestätigen' USING ERRCODE = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.rates WHERE contract_id = period.id AND effective_from > starts) AND (p_payload->>'confirm_future')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Spätere Konditionen ausdrücklich prüfen' USING ERRCODE = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.rates WHERE contract_id = period.id AND effective_from > starts GROUP BY effective_from HAVING count(*) > 1) THEN RAISE EXCEPTION 'Doppelte spätere Konditionen zuerst klären' USING ERRCODE = '22023'; END IF;
    IF ends IS NOT NULL AND EXISTS (SELECT 1 FROM public.rates WHERE contract_id = period.id AND effective_from > starts AND effective_from >= ends) THEN RAISE EXCEPTION 'Spätere Konditionen liegen außerhalb des neuen Endes' USING ERRCODE = '22023'; END IF;
    SELECT type INTO kind FROM public.meters WHERE id = period.meter_id;
    IF EXISTS (SELECT 1 FROM public.rates WHERE contract_id = period.id AND effective_from > starts AND
      (NOT isfinite(effective_from) OR grundpreis < 0 OR arbeitspreis < 0 OR abschlag < 0 OR umrechnungsfaktor <= 0
      OR grundpreis::text IN ('NaN','Infinity','-Infinity') OR arbeitspreis::text IN ('NaN','Infinity','-Infinity')
      OR abschlag::text IN ('NaN','Infinity','-Infinity') OR umrechnungsfaktor::text IN ('NaN','Infinity','-Infinity')
      OR (kind = 'electricity' AND umrechnungsfaktor <> 1))) THEN
      RAISE EXCEPTION 'Ungültige spätere Konditionen zuerst klären' USING ERRCODE = '22023';
    END IF;
    base := (p_payload->>'grundpreis')::numeric; price := (p_payload->>'arbeitspreis')::numeric;
    payment := (p_payload->>'abschlag')::numeric; factor := (p_payload->>'umrechnungsfaktor')::numeric;
    IF base IS NULL OR price IS NULL OR payment IS NULL OR factor IS NULL OR base < 0 OR price < 0 OR payment < 0 OR factor <= 0
      OR base::text IN ('NaN','Infinity','-Infinity') OR price::text IN ('NaN','Infinity','-Infinity') OR payment::text IN ('NaN','Infinity','-Infinity') OR factor::text IN ('NaN','Infinity','-Infinity') OR (kind = 'electricity' AND factor <> 1) THEN
      RAISE EXCEPTION 'Ungültige Anfangskonditionen' USING ERRCODE = '22023';
    END IF;
    -- End first, then insert: both are in the same transaction and meter lock.
    IF period.period_end IS NULL OR starts < period.period_end THEN
      UPDATE public.contracts SET period_end = starts WHERE id = period.id RETURNING * INTO period;
    END IF;
    INSERT INTO public.contracts(meter_id,period_start,period_end,provider)
      VALUES(period.meter_id,starts,ends,NULLIF(btrim(p_payload->>'provider'),'')) RETURNING * INTO next_period;
    INSERT INTO public.rates(contract_id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor)
      VALUES(next_period.id,starts,base,price,payment,factor);
    INSERT INTO public.rates(contract_id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor)
      SELECT next_period.id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor FROM public.rates
      WHERE contract_id = period.id AND effective_from > starts ORDER BY effective_from;
    INSERT INTO public.billing_continuation_requests(user_id,request_id,comparison_version,fingerprint,period_id) VALUES(account_id,p_request_id,1,public.request_fingerprint_v1(p_payload),next_period.id);
  END IF;
  RETURN jsonb_build_object('confirmed',true,'previous',to_jsonb(period),'contract',to_jsonb(next_period),'rates',
    (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY effective_from,id),'[]'::jsonb) FROM public.rates r WHERE contract_id = next_period.id));
END;
$$;
REVOKE ALL ON FUNCTION public.continue_billing_period(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.continue_billing_period(uuid,jsonb) TO authenticated;


COMMIT;
