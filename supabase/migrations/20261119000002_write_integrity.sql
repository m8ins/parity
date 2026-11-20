-- Slice 7: bounded write permissions and durable, versioned replay receipts.
-- Existing payloads are intentionally retained; no historical timestamps invented.
BEGIN;
CREATE FUNCTION public.request_json_v1(p_value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  CASE jsonb_typeof(p_value)
    WHEN 'number' THEN RETURN to_jsonb(trim_scale((p_value #>> '{}')::numeric));
    WHEN 'array' THEN
      SELECT COALESCE(jsonb_agg(public.request_json_v1(value) ORDER BY ord), '[]'::jsonb)
        INTO result FROM jsonb_array_elements(p_value) WITH ORDINALITY AS a(value, ord);
    WHEN 'object' THEN
      SELECT COALESCE(jsonb_object_agg(key, public.request_json_v1(value)), '{}'::jsonb)
        INTO result FROM jsonb_each(p_value);
    ELSE RETURN p_value;
  END CASE;
  RETURN result;
END;
$$;
CREATE FUNCTION public.request_fingerprint_v1(p_value jsonb) RETURNS bytea
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT sha256(convert_to('parity-request-jsonb-v1:' || public.request_json_v1(p_value)::text, 'UTF8'))
$$;
REVOKE ALL ON FUNCTION public.request_json_v1(jsonb), public.request_fingerprint_v1(jsonb) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.meter_setup_requests
  ALTER COLUMN payload DROP NOT NULL,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  ADD COLUMN comparison_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN fingerprint bytea,
  ADD CONSTRAINT meter_setup_requests_comparison CHECK (
    (comparison_version = 0 AND payload IS NOT NULL AND fingerprint IS NULL) OR
    (comparison_version = 1 AND payload IS NULL AND octet_length(fingerprint) = 32 AND fingerprint IS NOT NULL));
ALTER TABLE public.meter_setup_requests ALTER COLUMN created_at SET DEFAULT transaction_timestamp();
REVOKE ALL ON public.meter_setup_requests FROM PUBLIC, anon, authenticated;
COMMENT ON COLUMN public.meter_setup_requests.created_at IS 'Actual request commit transaction time; NULL for pre-Slice-7 receipts';
COMMENT ON COLUMN public.meter_setup_requests.recorded_at IS 'Receipt recorded in this format, including legacy migration time; not historical creation';

ALTER TABLE public.condition_requests
  ALTER COLUMN payload DROP NOT NULL,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  ADD COLUMN comparison_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN fingerprint bytea,
  ADD CONSTRAINT condition_requests_comparison CHECK (
    (comparison_version = 0 AND payload IS NOT NULL AND fingerprint IS NULL) OR
    (comparison_version = 1 AND payload IS NULL AND octet_length(fingerprint) = 32 AND fingerprint IS NOT NULL));
ALTER TABLE public.condition_requests ALTER COLUMN created_at SET DEFAULT transaction_timestamp();
REVOKE ALL ON public.condition_requests FROM PUBLIC, anon, authenticated;
COMMENT ON COLUMN public.condition_requests.created_at IS 'Actual request commit transaction time; NULL for pre-Slice-7 receipts';
COMMENT ON COLUMN public.condition_requests.recorded_at IS 'Receipt recorded in this format, including legacy migration time; not historical creation';

ALTER TABLE public.billing_continuation_requests
  ALTER COLUMN payload DROP NOT NULL,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  ADD COLUMN comparison_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN fingerprint bytea,
  ADD CONSTRAINT billing_continuation_requests_comparison CHECK (
    (comparison_version = 0 AND payload IS NOT NULL AND fingerprint IS NULL) OR
    (comparison_version = 1 AND payload IS NULL AND octet_length(fingerprint) = 32 AND fingerprint IS NOT NULL));
ALTER TABLE public.billing_continuation_requests ALTER COLUMN created_at SET DEFAULT transaction_timestamp();
REVOKE ALL ON public.billing_continuation_requests FROM PUBLIC, anon, authenticated;
COMMENT ON COLUMN public.billing_continuation_requests.created_at IS 'Actual request commit transaction time; NULL for pre-Slice-7 receipts';
COMMENT ON COLUMN public.billing_continuation_requests.recorded_at IS 'Receipt recorded in this format, including legacy migration time; not historical creation';

-- A deleted result remains a consumed key, never permission to execute again.
ALTER TABLE public.billing_continuation_requests
  DROP CONSTRAINT billing_continuation_requests_period_id_fkey,
  ALTER COLUMN period_id DROP NOT NULL,
  ADD CONSTRAINT billing_continuation_requests_period_id_fkey
    FOREIGN KEY (period_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Remove obsolete client write capabilities (RLS alone does not enforce RPC use).
REVOKE ALL ON public.rates, public.contracts, public.meters, public.readings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rates, public.contracts, public.meters, public.readings TO authenticated;
GRANT UPDATE (name) ON public.meters TO authenticated;
GRANT DELETE ON public.meters, public.readings TO authenticated;
GRANT INSERT (meter_id, date, value) ON public.readings TO authenticated;

CREATE FUNCTION public.validate_meter_name() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  IF length(NEW.name) < 2 THEN RAISE EXCEPTION 'Name muss mindestens zwei Zeichen haben' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_meter_name BEFORE INSERT OR UPDATE OF name ON public.meters
  FOR EACH ROW EXECUTE FUNCTION public.validate_meter_name();
CREATE FUNCTION public.validate_reading() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT isfinite(NEW.date) OR NEW.date > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Berlin')::date
    OR NEW.value < 0 OR NEW.value::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Datum oder Zählerstand ungültig' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_reading BEFORE INSERT OR UPDATE ON public.readings
  FOR EACH ROW EXECUTE FUNCTION public.validate_reading();
REVOKE ALL ON FUNCTION public.validate_meter_name(), public.validate_reading(), public.guard_condition_date(),
  public.guard_billing_period(), public.lock_billing_rate_parent() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.setup_meter(p_request_id uuid, p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid();
  receipt public.meter_setup_requests%ROWTYPE;
  new_meter uuid;
  new_contract uuid;
  kind text := p_payload->>'type';
  starts date;
  ends date;
  read_date date;
  base numeric;
  price numeric;
  payment numeric;
  factor numeric;
  reading_value numeric;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Ungültiger Einrichtungsauftrag' USING ERRCODE = '22023';
  END IF;
  -- Serialize same-account requests, including two simultaneous calls. Lock is
  -- released with the transaction; different accounts have independent receipts.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text || p_request_id::text, 0));
  SELECT * INTO receipt FROM public.meter_setup_requests WHERE user_id = account_id AND request_id = p_request_id;
  IF FOUND THEN
    IF (receipt.comparison_version = 0 AND receipt.payload IS DISTINCT FROM p_payload)
      OR (receipt.comparison_version = 1 AND receipt.fingerprint IS DISTINCT FROM public.request_fingerprint_v1(p_payload)) THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben gespeichert' USING ERRCODE = '22023'; END IF;
    IF receipt.meter_id IS NULL THEN RAISE EXCEPTION 'Der eingerichtete Zähler wurde gelöscht' USING ERRCODE = '22023'; END IF;
    RETURN receipt.meter_id;
  END IF;
  IF length(btrim(COALESCE(p_payload->>'name', ''))) < 2
    OR kind IS NULL OR kind NOT IN ('electricity', 'gas') THEN
    RAISE EXCEPTION 'Name oder Zählertyp ungültig' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_payload->>'period_start', '') !~ '^\d{4}-\d{2}-\d{2}$'
    OR COALESCE(p_payload->>'reading_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    OR (NULLIF(p_payload->>'period_end', '') IS NOT NULL AND p_payload->>'period_end' !~ '^\d{4}-\d{2}-\d{2}$') THEN
    RAISE EXCEPTION 'Datum fehlt oder ist ungültig' USING ERRCODE = '22023';
  END IF;
  starts := (p_payload->>'period_start')::date;
  ends := NULLIF(p_payload->>'period_end', '')::date;
  read_date := (p_payload->>'reading_date')::date;
  base := (p_payload->>'grundpreis')::numeric;
  price := (p_payload->>'arbeitspreis')::numeric;
  payment := (p_payload->>'abschlag')::numeric;
  factor := (p_payload->>'umrechnungsfaktor')::numeric;
  reading_value := (p_payload->>'reading_value')::numeric;
  IF starts > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Berlin')::date OR (ends IS NOT NULL AND ends <= starts)
    OR read_date < starts OR read_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Berlin')::date OR (ends IS NOT NULL AND read_date > ends)
    OR base IS NULL OR price IS NULL OR payment IS NULL OR factor IS NULL OR reading_value IS NULL
    OR base < 0 OR price < 0 OR payment < 0 OR reading_value < 0 OR factor <= 0
    OR base::text IN ('NaN','Infinity','-Infinity') OR price::text IN ('NaN','Infinity','-Infinity')
    OR payment::text IN ('NaN','Infinity','-Infinity') OR reading_value::text IN ('NaN','Infinity','-Infinity')
    OR factor::text IN ('NaN','Infinity','-Infinity') OR (kind = 'electricity' AND factor <> 1) THEN
    RAISE EXCEPTION 'Zeitraum, Konditionen oder Anfangsablesung ungültig' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.meters(user_id, name, type, monthly_distribution)
    VALUES(account_id, btrim(p_payload->>'name'), kind,
      CASE WHEN kind = 'gas' THEN ARRAY[.170,.150,.120,.080,.040,.020,.015,.015,.035,.090,.120,.145]::numeric[]
      ELSE array_fill((1.0/12)::numeric, ARRAY[12]) END) RETURNING id INTO new_meter;
  INSERT INTO public.contracts(meter_id, period_start, period_end, provider)
    VALUES(new_meter, starts, ends, NULLIF(btrim(p_payload->>'provider'), '')) RETURNING id INTO new_contract;
  INSERT INTO public.rates(contract_id, effective_from, grundpreis, arbeitspreis, abschlag, umrechnungsfaktor)
    VALUES(new_contract, starts, base, price, payment, factor);
  INSERT INTO public.readings(meter_id, date, value) VALUES(new_meter, read_date, reading_value);
  INSERT INTO public.meter_setup_requests(user_id, request_id, comparison_version, fingerprint, meter_id) VALUES(account_id, p_request_id, 1, public.request_fingerprint_v1(p_payload), new_meter);
  RETURN new_meter;
END;
$$;
REVOKE ALL ON FUNCTION public.setup_meter(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_meter(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_conditions(p_request_id uuid, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid();
  period public.contracts%ROWTYPE;
  old_rate public.rates%ROWTYPE;
  receipt public.condition_requests%ROWTYPE;
  current_snapshot jsonb;
  kind text;
  op text := p_payload->>'operation';
  target uuid;
  starts date;
  base numeric;
  price numeric;
  payment numeric;
  factor numeric;
  replay boolean := false;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Ungültige Angaben' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text || p_request_id::text, 4));
  -- Same order as continuation, end, settlement, details and meter deletion:
  -- request lock -> meter -> period -> condition advisory lock -> rates.
  PERFORM 1 FROM public.meters m JOIN public.contracts c ON c.meter_id = m.id
    WHERE c.id = (p_payload->>'contract_id')::uuid AND m.user_id = account_id FOR UPDATE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  -- Ownership is verified before either replay or mutation. Never trust a client user_id.
  SELECT c.* INTO period FROM public.contracts c JOIN public.meters m ON m.id = c.meter_id
    WHERE c.id = (p_payload->>'contract_id')::uuid AND m.user_id = account_id FOR UPDATE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(period.id::text, 4));
  SELECT * INTO receipt FROM public.condition_requests WHERE user_id = account_id AND request_id = p_request_id;
  IF FOUND THEN
    IF (receipt.comparison_version = 0 AND receipt.payload IS DISTINCT FROM p_payload)
      OR (receipt.comparison_version = 1 AND receipt.fingerprint IS DISTINCT FROM public.request_fingerprint_v1(p_payload)) THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben verwendet' USING ERRCODE = '22023'; END IF;
    replay := true;
  END IF;
  IF NOT replay THEN
    -- Lock existing rows as well as serializing this period's RPCs and inserts.
    PERFORM 1 FROM public.rates WHERE contract_id = period.id ORDER BY id FOR UPDATE;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'effective_from', effective_from,
      'grundpreis', grundpreis, 'arbeitspreis', arbeitspreis, 'abschlag', abschlag,
      'umrechnungsfaktor', umrechnungsfaktor) ORDER BY id), '[]'::jsonb)
      INTO current_snapshot FROM public.rates WHERE contract_id = period.id;
    IF p_payload->'expected_rates' IS DISTINCT FROM current_snapshot
      OR p_payload->'expected_period' IS DISTINCT FROM jsonb_build_object('period_start', period.period_start, 'period_end', period.period_end) THEN
      RAISE EXCEPTION 'Konditionen oder Zeitraum wurden inzwischen geändert. Bitte neu laden und Angaben prüfen.' USING ERRCODE = '40001';
    END IF;
    IF op IS NULL OR op NOT IN ('create', 'correct', 'delete') THEN
      RAISE EXCEPTION 'Ungültige Aktion' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(p_payload->>'effective_from', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Ungültiges Datum' USING ERRCODE = '22023';
    END IF;
    starts := (p_payload->>'effective_from')::date;
    IF op = 'create' THEN
      IF starts < period.period_start OR (period.period_end IS NOT NULL AND starts >= period.period_end) THEN
        RAISE EXCEPTION 'Datum außerhalb des ausgewählten Zeitraums (Ende exklusiv)' USING ERRCODE = '22023';
      END IF;
      IF EXISTS (SELECT 1 FROM public.rates WHERE contract_id = period.id AND effective_from = starts) THEN
        RAISE EXCEPTION 'Datum bereits vorhanden. Bitte ausdrücklich korrigieren.' USING ERRCODE = '23505';
      END IF;
    ELSE
      target := (p_payload->>'rate_id')::uuid;
      SELECT * INTO old_rate FROM public.rates WHERE id = target AND contract_id = period.id;
      IF NOT FOUND OR starts <> old_rate.effective_from THEN
        RAISE EXCEPTION 'Bestehende Konditionen nicht gefunden oder Datum verändert' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.condition_revisions(user_id, contract_id, rate_id, operation, previous)
        VALUES(account_id, period.id, target, op, to_jsonb(old_rate));
    END IF;
    IF op = 'delete' THEN
      DELETE FROM public.rates WHERE id = target AND contract_id = period.id;
    ELSE
      SELECT type INTO kind FROM public.meters WHERE id = period.meter_id;
      base := (p_payload->>'grundpreis')::numeric;
      price := (p_payload->>'arbeitspreis')::numeric;
      payment := (p_payload->>'abschlag')::numeric;
      factor := (p_payload->>'umrechnungsfaktor')::numeric;
      IF base IS NULL OR price IS NULL OR payment IS NULL OR factor IS NULL
        OR base < 0 OR price < 0 OR payment < 0 OR factor <= 0
        OR base::text IN ('NaN','Infinity','-Infinity') OR price::text IN ('NaN','Infinity','-Infinity')
        OR payment::text IN ('NaN','Infinity','-Infinity') OR factor::text IN ('NaN','Infinity','-Infinity')
        OR (kind = 'electricity' AND factor <> 1) THEN
        RAISE EXCEPTION 'Preise, Abschlag oder Faktor ungültig' USING ERRCODE = '22023';
      END IF;
      IF op = 'create' THEN
        INSERT INTO public.rates(contract_id, effective_from, grundpreis, arbeitspreis, abschlag, umrechnungsfaktor)
          VALUES(period.id, starts, base, price, payment, factor);
      ELSE
        UPDATE public.rates SET grundpreis = base, arbeitspreis = price, abschlag = payment, umrechnungsfaktor = factor
          WHERE id = target AND contract_id = period.id;
      END IF;
    END IF;
    INSERT INTO public.condition_requests(user_id, request_id, comparison_version, fingerprint) VALUES(account_id, p_request_id, 1, public.request_fingerprint_v1(p_payload));
  END IF;
  -- A retry returns today's authoritative history, never a stale saved snapshot.
  RETURN jsonb_build_object('confirmed', true, 'rates', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY effective_from, id), '[]'::jsonb)
    FROM public.rates r WHERE contract_id = period.id));
END;
$$;
REVOKE ALL ON FUNCTION public.change_conditions(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_conditions(uuid, jsonb) TO authenticated;


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

-- The existing details editor is the only remaining contract direct-write consumer.
CREATE FUNCTION public.save_billing_period_details(p_period_id uuid, p_expected jsonb, p_start date, p_provider text)
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
COMMIT;
