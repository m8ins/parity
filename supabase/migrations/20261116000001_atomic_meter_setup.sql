-- Additive setup receipts retain the outcome of a request even after a lost response.
-- auth.uid() scopes both the idempotency key and all inserted household data.
CREATE TABLE public.meter_setup_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  meter_id uuid REFERENCES public.meters(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.meter_setup_requests ENABLE ROW LEVEL SECURITY;
-- No direct client policies: receipts can only be accessed by this bounded RPC.
REVOKE ALL ON public.meter_setup_requests FROM anon, authenticated;

CREATE FUNCTION public.setup_meter(p_request_id uuid, p_payload jsonb)
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
    IF receipt.payload <> p_payload THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben gespeichert' USING ERRCODE = '22023'; END IF;
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
  INSERT INTO public.meter_setup_requests(user_id, request_id, payload, meter_id) VALUES(account_id, p_request_id, p_payload, new_meter);
  RETURN new_meter;
END;
$$;
REVOKE ALL ON FUNCTION public.setup_meter(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_meter(uuid, jsonb) TO authenticated;
