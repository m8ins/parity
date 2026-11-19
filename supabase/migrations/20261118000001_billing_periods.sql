-- Additive Slice 5: no historical rows are rewritten.
CREATE TABLE public.billing_continuation_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  period_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, request_id)
);
ALTER TABLE public.billing_continuation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_continuation_requests FROM PUBLIC, anon, authenticated;

-- Parent locks also cover direct legacy detail writes. Existing overlap is not
-- cleaned up, but no changed/new interval may introduce an overlap.
CREATE FUNCTION public.guard_billing_period() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.meter_id IS DISTINCT FROM OLD.meter_id THEN
    RAISE EXCEPTION 'Zählerzuordnung ist nicht veränderbar' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.meters WHERE id = NEW.meter_id FOR UPDATE;
  IF TG_OP = 'INSERT' OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.period_end IS DISTINCT FROM OLD.period_end THEN
    IF NOT isfinite(NEW.period_start) OR (NEW.period_end IS NOT NULL AND (NOT isfinite(NEW.period_end) OR NEW.period_end <= NEW.period_start)) THEN
      RAISE EXCEPTION 'Ungültige Zeitraumgrenzen' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.contracts c WHERE c.meter_id = NEW.meter_id AND c.id <> NEW.id
      AND (c.period_end IS NULL OR NEW.period_start < c.period_end)
      AND (NEW.period_end IS NULL OR c.period_start < NEW.period_end)) THEN
      RAISE EXCEPTION 'Abrechnungszeiträume dürfen sich nicht überlappen' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_billing_period BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_billing_period();

-- Lock the parent before dated-condition inserts/updates/deletes. RPCs already
-- lock it first; this closes the concurrent direct-write snapshot gap.
CREATE FUNCTION public.lock_billing_rate_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
    RAISE EXCEPTION 'Zeitraumzuordnung ist nicht veränderbar' USING ERRCODE = '22023';
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM 1 FROM public.contracts WHERE id = OLD.contract_id FOR UPDATE;
    RETURN OLD;
  END IF;
  PERFORM 1 FROM public.contracts WHERE id = NEW.contract_id FOR UPDATE;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_lock_billing_rate_parent BEFORE INSERT OR UPDATE OR DELETE ON public.rates FOR EACH ROW EXECUTE FUNCTION public.lock_billing_rate_parent();

CREATE FUNCTION public.save_billing_settlement(p_period_id uuid, p_expected_period jsonb, p_expected_amount numeric, p_expected_date date, p_amount numeric, p_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  period public.contracts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  PERFORM 1 FROM public.meters m JOIN public.contracts c ON c.meter_id = m.id
    WHERE c.id = p_period_id AND m.user_id = auth.uid() FOR UPDATE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  SELECT * INTO period FROM public.contracts WHERE id = p_period_id FOR UPDATE;
  IF p_expected_period IS DISTINCT FROM jsonb_build_object('period_start', period.period_start, 'period_end', period.period_end) THEN
    RAISE EXCEPTION 'Zeitraum wurde inzwischen geändert. Bitte neu laden.' USING ERRCODE = '40001';
  END IF;
  IF period.period_end IS NULL OR p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity')
    OR p_date IS NULL OR NOT isfinite(p_date) OR p_date < period.period_start OR p_date > (now() AT TIME ZONE 'Europe/Berlin')::date THEN
    RAISE EXCEPTION 'Tatsächliches Ende, Betrag und gültiges Abrechnungsdatum erforderlich' USING ERRCODE = '22023';
  END IF;
  IF period.settlement_amount IS NOT DISTINCT FROM p_amount AND period.settlement_date IS NOT DISTINCT FROM p_date THEN RETURN to_jsonb(period); END IF;
  IF period.settlement_amount IS DISTINCT FROM p_expected_amount OR period.settlement_date IS DISTINCT FROM p_expected_date THEN
    RAISE EXCEPTION 'Schlussabrechnung wurde inzwischen geändert. Bitte neu laden.' USING ERRCODE = '40001';
  END IF;
  UPDATE public.contracts SET settlement_amount = p_amount, settlement_date = p_date WHERE id = period.id RETURNING * INTO period;
  RETURN to_jsonb(period);
END;
$$;
REVOKE ALL ON FUNCTION public.save_billing_settlement(uuid,jsonb,numeric,date,numeric,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_billing_settlement(uuid,jsonb,numeric,date,numeric,date) TO authenticated;

CREATE FUNCTION public.continue_billing_period(p_request_id uuid, p_payload jsonb) RETURNS jsonb
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
    IF receipt.payload <> p_payload THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben verwendet' USING ERRCODE = '22023'; END IF;
    SELECT * INTO next_period FROM public.contracts WHERE id = receipt.period_id AND meter_id = period.meter_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Folgezeitraum nicht mehr verfügbar' USING ERRCODE = '40001'; END IF;
  ELSE
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
    INSERT INTO public.billing_continuation_requests(user_id,request_id,payload,period_id) VALUES(account_id,p_request_id,p_payload,next_period.id);
  END IF;
  RETURN jsonb_build_object('confirmed',true,'previous',to_jsonb(period),'contract',to_jsonb(next_period),'rates',
    (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY effective_from,id),'[]'::jsonb) FROM public.rates r WHERE contract_id = next_period.id));
END;
$$;
REVOKE ALL ON FUNCTION public.continue_billing_period(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.continue_billing_period(uuid,jsonb) TO authenticated;
