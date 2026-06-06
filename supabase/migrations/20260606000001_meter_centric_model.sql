-- Migration: Contract-centric → Meter-centric data model
-- Shape A from parity/shaping: Meter is the top-level entity.
-- Readings belong to meters. Contracts define billing periods. Rates replace contract_prices + contract_payments.

-- ============================================================
-- 1. Backup current tables (pure snapshots, no RLS/FKs)
-- ============================================================
CREATE TABLE contracts_backup          AS SELECT * FROM public.contracts;
CREATE TABLE readings_backup           AS SELECT * FROM public.readings;
CREATE TABLE contract_prices_backup    AS SELECT * FROM public.contract_prices;
CREATE TABLE contract_payments_backup  AS SELECT * FROM public.contract_payments;

-- ============================================================
-- 2. Create meters table
-- _old_contract_id is a temp migration column, dropped at step 10.
-- ============================================================
CREATE TABLE public.meters (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users NOT NULL,
  name                 text NOT NULL,
  type                 text NOT NULL CHECK (type IN ('electricity', 'gas')),
  monthly_distribution numeric[] DEFAULT NULL,
  _old_contract_id     uuid, -- migration anchor, removed below
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- 3. Populate meters from existing contracts (1:1 mapping)
-- ============================================================
INSERT INTO public.meters (user_id, name, type, monthly_distribution, _old_contract_id, created_at, updated_at)
SELECT user_id, name, type, monthly_distribution, id, created_at, updated_at
FROM public.contracts;

-- ============================================================
-- 4. Add meter_id to contracts, populate via mapping, add FK
-- ============================================================
ALTER TABLE public.contracts ADD COLUMN meter_id uuid;

UPDATE public.contracts c
SET meter_id = m.id
FROM public.meters m
WHERE m._old_contract_id = c.id;

ALTER TABLE public.contracts ALTER COLUMN meter_id SET NOT NULL;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_meter_id_fkey
  FOREIGN KEY (meter_id) REFERENCES public.meters(id) ON DELETE CASCADE;

-- ============================================================
-- 5. Rename billing-period columns
-- ============================================================
ALTER TABLE public.contracts RENAME COLUMN start_date TO period_start;
ALTER TABLE public.contracts RENAME COLUMN end_date   TO period_end;

-- ============================================================
-- 6. Create rates table
-- Merges contract_prices + contract_payments + umrechnungsfaktor
-- ============================================================
CREATE TABLE public.rates (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id       uuid REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  effective_from    date NOT NULL,
  grundpreis        numeric NOT NULL DEFAULT 0, -- €/month (was base_price_monthly)
  arbeitspreis      numeric NOT NULL DEFAULT 0, -- ct/kWh (was energy_price_cents_per_kwh)
  abschlag          numeric NOT NULL DEFAULT 0, -- €/month (was monthly_payment)
  umrechnungsfaktor numeric NOT NULL DEFAULT 1, -- kWh/m³ (was conversion_factor_m3_to_kwh)
  created_at        timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- 7. Populate rates by merging contract_prices + contract_payments
-- For each distinct valid_from per contract, find the latest
-- price and payment at or before that date.
-- umrechnungsfaktor comes from the contracts table (still present).
-- ============================================================
INSERT INTO public.rates (contract_id, effective_from, grundpreis, arbeitspreis, abschlag, umrechnungsfaktor)
WITH price_dates AS (
  SELECT contract_id, valid_from, base_price_monthly, energy_price_cents_per_kwh
  FROM public.contract_prices
),
payment_dates AS (
  SELECT contract_id, valid_from, monthly_payment
  FROM public.contract_payments
),
all_dates AS (
  SELECT contract_id, valid_from FROM price_dates
  UNION
  SELECT contract_id, valid_from FROM payment_dates
),
merged AS (
  SELECT
    d.contract_id,
    d.valid_from,
    (SELECT p.base_price_monthly
     FROM price_dates p
     WHERE p.contract_id = d.contract_id AND p.valid_from <= d.valid_from
     ORDER BY p.valid_from DESC LIMIT 1) AS grundpreis,
    (SELECT p.energy_price_cents_per_kwh
     FROM price_dates p
     WHERE p.contract_id = d.contract_id AND p.valid_from <= d.valid_from
     ORDER BY p.valid_from DESC LIMIT 1) AS arbeitspreis,
    (SELECT pay.monthly_payment
     FROM payment_dates pay
     WHERE pay.contract_id = d.contract_id AND pay.valid_from <= d.valid_from
     ORDER BY pay.valid_from DESC LIMIT 1) AS abschlag
  FROM all_dates d
)
SELECT
  m.contract_id,
  m.valid_from                      AS effective_from,
  COALESCE(m.grundpreis, 0),
  COALESCE(m.arbeitspreis, 0),
  COALESCE(m.abschlag, 0),
  c.conversion_factor_m3_to_kwh     AS umrechnungsfaktor
FROM merged m
JOIN public.contracts c ON c.id = m.contract_id;

-- ============================================================
-- 8. Migrate readings: contract_id → meter_id
-- ============================================================
ALTER TABLE public.readings ADD COLUMN meter_id uuid;

UPDATE public.readings r
SET meter_id = mt.id
FROM public.meters mt
WHERE mt._old_contract_id = r.contract_id;

ALTER TABLE public.readings ALTER COLUMN meter_id SET NOT NULL;
ALTER TABLE public.readings
  ADD CONSTRAINT readings_meter_id_fkey
  FOREIGN KEY (meter_id) REFERENCES public.meters(id) ON DELETE CASCADE;

-- ============================================================
-- 8.5 Drop old RLS policies that reference columns being removed
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own contracts"    ON public.contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts"  ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts"  ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts"  ON public.contracts;

DROP POLICY IF EXISTS "Users can view their own readings"     ON public.readings;
DROP POLICY IF EXISTS "Users can insert their own readings"   ON public.readings;
DROP POLICY IF EXISTS "Users can update their own readings"   ON public.readings;
DROP POLICY IF EXISTS "Users can delete their own readings"   ON public.readings;

-- Policies on contract_prices / contract_payments also reference contracts.user_id
-- (added in migration 20251230000002). Drop them before the column is removed.
DROP POLICY IF EXISTS "Users can view their own contract prices"    ON public.contract_prices;
DROP POLICY IF EXISTS "Users can insert their own contract prices"  ON public.contract_prices;
DROP POLICY IF EXISTS "Users can update their own contract prices"  ON public.contract_prices;
DROP POLICY IF EXISTS "Users can delete their own contract prices"  ON public.contract_prices;

DROP POLICY IF EXISTS "Users can view their own contract payments"   ON public.contract_payments;
DROP POLICY IF EXISTS "Users can insert their own contract payments" ON public.contract_payments;
DROP POLICY IF EXISTS "Users can update their own contract payments" ON public.contract_payments;
DROP POLICY IF EXISTS "Users can delete their own contract payments" ON public.contract_payments;

-- ============================================================
-- 9. Drop now-redundant columns from contracts
-- ============================================================
ALTER TABLE public.readings DROP COLUMN contract_id;

ALTER TABLE public.contracts DROP COLUMN user_id;
ALTER TABLE public.contracts DROP COLUMN name;
ALTER TABLE public.contracts DROP COLUMN type;
ALTER TABLE public.contracts DROP COLUMN provider;
ALTER TABLE public.contracts DROP COLUMN base_price_monthly;
ALTER TABLE public.contracts DROP COLUMN energy_price_cents_per_kwh;
ALTER TABLE public.contracts DROP COLUMN monthly_payment;
ALTER TABLE public.contracts DROP COLUMN monthly_distribution;
ALTER TABLE public.contracts DROP COLUMN conversion_factor_m3_to_kwh;

-- ============================================================
-- 10. Drop migration temp column
-- ============================================================
ALTER TABLE public.meters DROP COLUMN _old_contract_id;

-- ============================================================
-- 11. Drop superseded tables
-- ============================================================
DROP TABLE public.contract_prices;
DROP TABLE public.contract_payments;

-- ============================================================
-- 12. RLS on new tables + updated policies for all tables
-- ============================================================
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates  ENABLE ROW LEVEL SECURITY;

-- meters: direct user_id check
CREATE POLICY "Users can view their own meters" ON public.meters
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own meters" ON public.meters
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own meters" ON public.meters
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own meters" ON public.meters
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- contracts: via meter FK
CREATE POLICY "Users can view their own contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = contracts.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert their own contracts" ON public.contracts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = contracts.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can update their own contracts" ON public.contracts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = contracts.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can delete their own contracts" ON public.contracts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = contracts.meter_id AND m.user_id = (SELECT auth.uid()))
  );

-- rates: via contract → meter FK
CREATE POLICY "Users can view their own rates" ON public.rates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.meters m ON m.id = c.meter_id
      WHERE c.id = rates.contract_id AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert their own rates" ON public.rates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.meters m ON m.id = c.meter_id
      WHERE c.id = rates.contract_id AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own rates" ON public.rates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.meters m ON m.id = c.meter_id
      WHERE c.id = rates.contract_id AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own rates" ON public.rates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.meters m ON m.id = c.meter_id
      WHERE c.id = rates.contract_id AND m.user_id = (SELECT auth.uid())
    )
  );

-- readings: via meter FK
CREATE POLICY "Users can view their own readings" ON public.readings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = readings.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert their own readings" ON public.readings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = readings.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can update their own readings" ON public.readings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = readings.meter_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can delete their own readings" ON public.readings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meters m WHERE m.id = readings.meter_id AND m.user_id = (SELECT auth.uid()))
  );
