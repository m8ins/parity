-- Seed file for local development
-- Run via: supabase db reset

INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd',
    'authenticated', 'authenticated',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd',
    'test@example.com',
    jsonb_build_object('sub', '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd', 'email', 'test@example.com'),
    'email', now(), now(), now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

DO $$
DECLARE
    test_user_id        uuid := '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd'::uuid;
    strom_meter_id      uuid;
    gas_meter_id        uuid;
    strom_contract_id   uuid;
    gas_contract_id     uuid;
BEGIN
    -- Meters
    INSERT INTO public.meters (user_id, name, type, monthly_distribution)
    VALUES (test_user_id, 'Strom', 'electricity', ARRAY[0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083])
    RETURNING id INTO strom_meter_id;

    INSERT INTO public.meters (user_id, name, type, monthly_distribution)
    VALUES (test_user_id, 'Gas', 'gas', ARRAY[0.170, 0.150, 0.120, 0.080, 0.040, 0.020, 0.015, 0.015, 0.035, 0.090, 0.120, 0.145])
    RETURNING id INTO gas_meter_id;

    -- Contracts (billing periods)
    INSERT INTO public.contracts (meter_id, period_start)
    VALUES (strom_meter_id, '2025-10-18')
    RETURNING id INTO strom_contract_id;

    INSERT INTO public.contracts (meter_id, period_start)
    VALUES (gas_meter_id, '2025-11-01')
    RETURNING id INTO gas_contract_id;

    -- Initial rates
    INSERT INTO public.rates (contract_id, effective_from, grundpreis, arbeitspreis, abschlag, umrechnungsfaktor)
    VALUES (strom_contract_id, '2025-10-18', 8.90, 34.5, 70.00, 1);

    INSERT INTO public.rates (contract_id, effective_from, grundpreis, arbeitspreis, abschlag, umrechnungsfaktor)
    VALUES (gas_contract_id, '2025-11-01', 9.90, 9.33, 109.00, 10);

    -- Readings (Strom)
    INSERT INTO public.readings (meter_id, date, value) VALUES
        (strom_meter_id, '2025-04-01', 228558),
        (strom_meter_id, '2025-05-01', 228703),
        (strom_meter_id, '2025-06-01', 228871),
        (strom_meter_id, '2025-07-01', 229007),
        (strom_meter_id, '2025-08-01', 229142),
        (strom_meter_id, '2025-09-01', 229260),
        (strom_meter_id, '2025-10-01', 229386),
        (strom_meter_id, '2025-11-01', 229551),
        (strom_meter_id, '2025-12-01', 229730);

    -- Readings (Gas)
    INSERT INTO public.readings (meter_id, date, value) VALUES
        (gas_meter_id, '2025-04-01', 15652),
        (gas_meter_id, '2025-05-01', 15681),
        (gas_meter_id, '2025-06-01', 15688),
        (gas_meter_id, '2025-07-01', 15690),
        (gas_meter_id, '2025-08-01', 15692),
        (gas_meter_id, '2025-09-01', 15695),
        (gas_meter_id, '2025-10-01', 15713),
        (gas_meter_id, '2025-11-01', 15778),
        (gas_meter_id, '2025-12-01', 15923);

    RAISE NOTICE 'Seed erfolgreich. Strom-Meter: %, Gas-Meter: %', strom_meter_id, gas_meter_id;
END $$;
