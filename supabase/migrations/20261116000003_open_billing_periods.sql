-- Keep unknown billing ends open. The calculation horizon is not a data boundary.
-- No existing rows are rewritten. Existing receipts/revisions remain intact.
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
  -- Ownership is verified before either replay or mutation. Never trust a client user_id.
  SELECT c.* INTO period FROM public.contracts c JOIN public.meters m ON m.id = c.meter_id
    WHERE c.id = (p_payload->>'contract_id')::uuid AND m.user_id = account_id FOR UPDATE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(period.id::text, 4));
  SELECT * INTO receipt FROM public.condition_requests WHERE user_id = account_id AND request_id = p_request_id;
  IF FOUND THEN
    IF receipt.payload <> p_payload THEN RAISE EXCEPTION 'Auftrag bereits mit anderen Angaben verwendet' USING ERRCODE = '22023'; END IF;
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
    INSERT INTO public.condition_requests(user_id, request_id, payload) VALUES(account_id, p_request_id, p_payload);
  END IF;
  -- A retry returns today's authoritative history, never a stale saved snapshot.
  RETURN jsonb_build_object('confirmed', true, 'rates', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY effective_from, id), '[]'::jsonb)
    FROM public.rates r WHERE contract_id = period.id));
END;
$$;
REVOKE ALL ON FUNCTION public.change_conditions(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_conditions(uuid, jsonb) TO authenticated;

-- Absolute, optimistic update: retrying the same confirmed end is a no-op.
CREATE OR REPLACE FUNCTION public.set_billing_period_end(p_period_id uuid, p_expected_start date, p_expected_end date, p_end date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account_id uuid := auth.uid();
  period public.contracts%ROWTYPE;
  next_start date;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Anmeldung erforderlich' USING ERRCODE = '28000'; END IF;
  -- Lock the meter first to serialize period-boundary edits for the same meter.
  PERFORM 1 FROM public.meters m JOIN public.contracts c ON c.meter_id = m.id
    WHERE c.id = p_period_id AND m.user_id = account_id FOR UPDATE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeitraum nicht verfügbar' USING ERRCODE = '42501'; END IF;
  SELECT * INTO period FROM public.contracts WHERE id = p_period_id FOR UPDATE;
  IF period.period_start IS DISTINCT FROM p_expected_start THEN
    RAISE EXCEPTION 'Der Beginn wurde inzwischen verändert' USING ERRCODE = '40001';
  END IF;
  IF p_end IS NOT NULL AND (NOT isfinite(p_end) OR p_end <= period.period_start) THEN
    RAISE EXCEPTION 'Das Ende muss nach dem Beginn liegen' USING ERRCODE = '22023';
  END IF;
  SELECT min(period_start) INTO next_start FROM public.contracts
    WHERE meter_id = period.meter_id AND period_start > period.period_start;
  IF next_start IS NOT NULL AND (p_end IS NULL OR p_end > next_start) THEN
    RAISE EXCEPTION 'Das Ende darf den anschließenden Abrechnungszeitraum nicht überlappen' USING ERRCODE = '22023';
  END IF;
  IF period.period_end IS NOT DISTINCT FROM p_end THEN RETURN to_jsonb(period); END IF;
  IF period.period_end IS DISTINCT FROM p_expected_end THEN
    RAISE EXCEPTION 'Das Ende wurde inzwischen verändert' USING ERRCODE = '40001';
  END IF;
  UPDATE public.contracts SET period_end = p_end WHERE id = period.id RETURNING * INTO period;
  RETURN to_jsonb(period);
END;
$$;
REVOKE ALL ON FUNCTION public.set_billing_period_end(uuid, date, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_billing_period_end(uuid, date, date, date) TO authenticated;
