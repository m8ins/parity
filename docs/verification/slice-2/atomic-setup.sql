-- Run with psql as postgres against a known local test DB only.
-- This transaction creates its own synthetic auth user and rolls everything back.
BEGIN;
DO $$
DECLARE
  account uuid := gen_random_uuid();
  request uuid := gen_random_uuid();
  meter uuid;
  again uuid;
  body jsonb := '{"name":"SQL fixture","type":"electricity","provider":"Test","period_start":"2025-01-01","period_end":"2025-04-01","grundpreis":12.5,"arbeitspreis":32.456,"abschlag":0,"umrechnungsfaktor":1,"reading_date":"2025-01-01","reading_value":12345.6789}'::jsonb;
BEGIN
  INSERT INTO auth.users(id) VALUES(account);
  PERFORM set_config('request.jwt.claim.sub', account::text, true);
  meter := public.setup_meter(request, body);
  again := public.setup_meter(request, body);
  IF meter <> again OR (SELECT count(*) FROM public.meters WHERE user_id = account) <> 1 THEN RAISE EXCEPTION 'idempotency failed'; END IF;
  IF (SELECT count(*) FROM public.rates r JOIN public.contracts c ON c.id = r.contract_id WHERE c.meter_id = meter) <> 1
    OR (SELECT count(*) FROM public.readings WHERE meter_id = meter) <> 1 THEN RAISE EXCEPTION 'incomplete setup'; END IF;
  BEGIN
    PERFORM public.setup_meter(request, body || '{"name":"Changed"}'::jsonb);
    RAISE EXCEPTION 'changed request accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.setup_meter(gen_random_uuid(), body || '{"period_end":"2025-01-01"}'::jsonb);
    RAISE EXCEPTION 'empty period accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.setup_meter(gen_random_uuid(), body - 'reading_value');
    RAISE EXCEPTION 'missing reading accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.setup_meter(gen_random_uuid(), body || '{"reading_value":"NaN"}'::jsonb);
    RAISE EXCEPTION 'NaN accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT count(*) FROM public.meters WHERE user_id = account) <> 1 THEN RAISE EXCEPTION 'validation left partial data'; END IF;
END $$;
-- Force an error AFTER meter and contract insertion. The RPC must leave neither
-- of those rows nor a receipt; validation-only failures cannot prove this.
CREATE FUNCTION public.test_setup_rate_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.grundpreis = 987654321 THEN RAISE EXCEPTION 'synthetic downstream failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_setup_rate_failure BEFORE INSERT ON public.rates FOR EACH ROW EXECUTE FUNCTION public.test_setup_rate_failure();
DO $$
DECLARE
  account uuid := gen_random_uuid();
  request uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id) VALUES(account);
  PERFORM set_config('request.jwt.claim.sub', account::text, true);
  BEGIN
    PERFORM public.setup_meter(request, '{"name":"Rollback fixture","type":"electricity","period_start":"2025-01-01","grundpreis":987654321,"arbeitspreis":30,"abschlag":0,"umrechnungsfaktor":1,"reading_date":"2025-01-01","reading_value":0}'::jsonb);
    RAISE EXCEPTION 'downstream failure not raised';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'synthetic downstream failure' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT FROM public.meters WHERE user_id = account) OR EXISTS(SELECT FROM public.meter_setup_requests WHERE user_id = account) THEN RAISE EXCEPTION 'partial transaction survived'; END IF;
END $$;
ROLLBACK;
