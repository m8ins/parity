-- Seed file for local development
-- This file will be executed when running `supabase db reset`

-- Note: This assumes you have a test user already created in your local Supabase Auth
-- You can get the user UUID from the Supabase dashboard or create one first
-- For now, we'll use a placeholder UUID that you should replace with your actual test user ID

-- Replace this with your actual test user UUID from Supabase Auth
-- You can find this in the Supabase Studio -> Authentication -> Users
-- Insert a test user into auth.users to avoid foreign key constraint violations
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd',
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insert Identifiers for the user (optional but good for completeness)
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd',
    'test@example.com',
    jsonb_build_object('sub', '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd', 'email', 'test@example.com'),
    'email',
    now(),
    now(),
    now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

DO $$
DECLARE
    test_user_id uuid := '7882ab4f-4b91-416f-a641-b5e9ca3ea6dd'::uuid; -- REPLACE WITH YOUR ACTUAL USER ID
    electricity_contract_id uuid;
    gas_contract_id uuid;
BEGIN
    -- Check if user exists (replace with your actual user check if needed)
    -- For local development, you might want to create a test user first
    
    -- Insert Electricity Contract
    INSERT INTO public.contracts (
        id,
        user_id,
        name,
        type,
        provider,
        start_date,
        base_price_monthly,
        energy_price_cents_per_kwh,
        monthly_payment,
        conversion_factor_m3_to_kwh,
        monthly_distribution
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        'Strom',
        'electricity',
        'Vattenfall',
        '2025-10-18',
        8.90,  -- base price per month
        34.5,   -- price per kWh
        70,  -- monthly payment
        1,      -- Not applicable for electricity
        ARRAY[0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083, 0.083] -- Even distribution
    ) RETURNING id INTO electricity_contract_id;

    -- Insert Gas Contract
    INSERT INTO public.contracts (
        id,
        user_id,
        name,
        type,
        provider,
        start_date,
        base_price_monthly,
        energy_price_cents_per_kwh,
        monthly_payment,
        conversion_factor_m3_to_kwh,
        monthly_distribution
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        'Gas',
        'gas',
        'Vattenfall',
        '2025-11-01',
        9.90,  -- base price per month
        9.33,   -- price per kWh
        109.00, -- monthly payment
        10,     -- 10 kWh per m³ conversion factor
        ARRAY[0.170, 0.150, 0.120, 0.080, 0.040, 0.020, 0.015, 0.015, 0.035, 0.090, 0.120, 0.145] -- Seasonal distribution (winter-heavy)
    ) RETURNING id INTO gas_contract_id;

    -- Insert Contract Prices (Price History)
    -- Electricity Prices
    INSERT INTO public.contract_prices (contract_id, valid_from, base_price_monthly, energy_price_cents_per_kwh)
    VALUES 
        (electricity_contract_id, '2024-01-01', 12.50, 32.5);


    -- Gas Prices
    INSERT INTO public.contract_prices (contract_id, valid_from, base_price_monthly, energy_price_cents_per_kwh)
    VALUES 
        (gas_contract_id, '2024-01-01', 9.90, 9.33);


    -- Insert Contract Payments (Payment History)
    -- Electricity Payments
    INSERT INTO public.contract_payments (contract_id, valid_from, monthly_payment)
    VALUES 
        (electricity_contract_id, '2024-01-01', 85.00);


    -- Gas Payments
    INSERT INTO public.contract_payments (contract_id, valid_from, monthly_payment)
    VALUES 
        (gas_contract_id, '2024-01-01', 109.00);



    INSERT INTO public.readings (contract_id, date, value)
    VALUES 
        (electricity_contract_id, '2025-04-01', 228558),  
        (electricity_contract_id, '2025-05-01', 228703),
        (electricity_contract_id, '2025-06-01', 228871),
        (electricity_contract_id, '2025-07-01', 229007),
        (electricity_contract_id, '2025-08-01', 229142),
        (electricity_contract_id, '2025-09-01', 229260),
        (electricity_contract_id, '2025-10-01', 229386),
        (electricity_contract_id, '2025-11-01', 229551),
        (electricity_contract_id, '2025-12-01', 229730);



    INSERT INTO public.readings (contract_id, date, value)
    VALUES 
        (gas_contract_id, '2025-04-01', 15652),    
        (gas_contract_id, '2025-05-01', 15681),    
        (gas_contract_id, '2025-06-01', 15688),    
        (gas_contract_id, '2025-07-01', 15690),   
        (gas_contract_id, '2025-08-01', 15692),   
        (gas_contract_id, '2025-09-01', 15695),   
        (gas_contract_id, '2025-10-01', 15713),   
        (gas_contract_id, '2025-11-01', 15778),   
        (gas_contract_id, '2025-12-01', 15923);    

    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Electricity Contract ID: %', electricity_contract_id;
    RAISE NOTICE 'Gas Contract ID: %', gas_contract_id;
    RAISE NOTICE 'Remember to replace test_user_id with your actual user UUID!';
END $$;
