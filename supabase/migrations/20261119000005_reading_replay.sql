-- Close the remaining append retry gap without deduplicating deliberate readings.
BEGIN;
CREATE TABLE public.reading_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  comparison_version smallint NOT NULL DEFAULT 1 CHECK (comparison_version = 1),
  fingerprint bytea NOT NULL CHECK (octet_length(fingerprint) = 32),
  reading_id uuid REFERENCES public.readings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.reading_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reading_requests FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.readings FROM PUBLIC, anon, authenticated;
REVOKE INSERT (meter_id, date, value) ON public.readings FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.record_reading(p_request_id uuid, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid(); receipt public.reading_requests%ROWTYPE; reading public.readings%ROWTYPE;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Ungültiger Ableseauftrag' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text || p_request_id::text, 7));
  PERFORM 1 FROM public.meters WHERE id=(p_payload->>'meter_id')::uuid AND user_id=account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zähler nicht verfügbar' USING ERRCODE = '42501'; END IF;
  SELECT * INTO receipt FROM public.reading_requests WHERE user_id=account_id AND request_id=p_request_id;
  IF FOUND THEN
    IF receipt.fingerprint IS DISTINCT FROM public.request_fingerprint_v1(p_payload) THEN
      RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben verwendet' USING ERRCODE = '22023';
    END IF;
    IF receipt.reading_id IS NULL THEN RAISE EXCEPTION 'Ablesung wurde gelöscht' USING ERRCODE = '22023'; END IF;
    SELECT * INTO reading FROM public.readings WHERE id=receipt.reading_id AND meter_id=(p_payload->>'meter_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ablesung nicht verfügbar' USING ERRCODE = '42501'; END IF;
  ELSE
    IF COALESCE(p_payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' OR p_payload->>'value' IS NULL THEN
      RAISE EXCEPTION 'Ablesedatum oder Stand fehlt' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.readings(meter_id,date,value)
      VALUES((p_payload->>'meter_id')::uuid,(p_payload->>'date')::date,(p_payload->>'value')::numeric) RETURNING * INTO reading;
    INSERT INTO public.reading_requests(user_id,request_id,fingerprint,reading_id)
      VALUES(account_id,p_request_id,public.request_fingerprint_v1(p_payload),reading.id);
  END IF;
  RETURN to_jsonb(reading);
END;
$$;
REVOKE ALL ON FUNCTION public.record_reading(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_reading(uuid,jsonb) TO authenticated;
COMMIT;
