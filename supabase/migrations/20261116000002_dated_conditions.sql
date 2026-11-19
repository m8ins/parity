-- Additive: no household rows are rewritten or deduplicated.
CREATE TABLE public.condition_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.condition_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.condition_requests FROM anon, authenticated;

CREATE TABLE public.condition_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  rate_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('correct', 'delete')),
  previous jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.condition_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.condition_revisions FROM anon, authenticated;
GRANT SELECT ON public.condition_revisions TO authenticated;
CREATE POLICY "Owners can read condition revisions" ON public.condition_revisions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.contracts c JOIN public.meters m ON m.id = c.meter_id
    WHERE c.id = condition_revisions.contract_id AND m.user_id = (SELECT auth.uid())
  ));

-- Preserve legacy duplicates for explicit resolution. Prevent any new ones,
-- including inserts through the existing setup/rollover paths.
CREATE FUNCTION public.guard_condition_date() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.contract_id::text, 4));
  IF EXISTS (SELECT 1 FROM public.rates WHERE contract_id = NEW.contract_id
      AND effective_from = NEW.effective_from AND id <> NEW.id) THEN
    RAISE EXCEPTION 'Für dieses Datum bestehen bereits Konditionen. Bitte ausdrücklich korrigieren.' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_condition_date BEFORE INSERT OR UPDATE ON public.rates
  FOR EACH ROW EXECUTE FUNCTION public.guard_condition_date();

CREATE FUNCTION public.change_conditions(p_request_id uuid, p_payload jsonb) RETURNS jsonb
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
      IF starts < period.period_start OR starts >= COALESCE(period.period_end, (period.period_start + INTERVAL '1 year')::date) THEN
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
