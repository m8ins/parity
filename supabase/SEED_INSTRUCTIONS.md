# Supabase Seed File Instructions

This document explains how to use the `seed.sql` file to populate your local Supabase database with test data.

## Overview

The seed file creates:
- **2 Contracts**: One electricity contract and one gas contract
- **Price History**: Multiple price points showing price changes over time
- **Payment History**: Monthly payment adjustments
- **Meter Readings**: Realistic monthly readings for both contracts

## Before Running the Seed

**IMPORTANT**: You must replace the placeholder user ID in `seed.sql` with your actual test user UUID:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Open the Supabase Studio (usually at http://localhost:54323)

3. Go to **Authentication** → **Users**

4. If you don't have a test user yet, create one:
   - Click "Add user"
   - Enter an email (e.g., `test@example.com`)
   - Set a password
   - Click "Create user"

5. Copy the **User UUID** from the users table

6. Open `supabase/seed.sql` and replace this line:
   ```sql
   test_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
   ```
   With your actual user UUID:
   ```sql
   test_user_id uuid := 'your-actual-uuid-here'::uuid;
   ```

## Running the Seed File

### Method 1: Database Reset (Recommended for Development)

This will reset your entire database and run all migrations plus the seed:

```bash
supabase db reset
```

### Method 2: Manual Execution

If you just want to run the seed without resetting:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

Or using the Supabase CLI:

```bash
supabase db execute --file supabase/seed.sql
```

## Seed Data Details

### Electricity Contract
- **Name**: Home Electricity
- **Provider**: Stadtwerke München
- **Base Price**: €12.50/month
- **Energy Price**: 32.5 cents/kWh (starting), 35.0 cents/kWh (from July 2024)
- **Monthly Payment**: €85 (starting), €90 (from August 2024)
- **Annual Consumption**: ~3,000 kWh (typical household)
- **Distribution**: Even throughout the year

### Gas Contract
- **Name**: Home Gas
- **Provider**: Stadtwerke München
- **Base Price**: €15.00/month
- **Energy Price**: 12.8 cents/kWh (starting), 13.5 cents/kWh (from July 2024)
- **Monthly Payment**: €120 (starting), €130 (from August 2024)
- **Annual Consumption**: ~1,000 m³ = ~10,000 kWh (typical heating + hot water)
- **Distribution**: Seasonal (winter-heavy) following standard load profile
- **Conversion Factor**: 10 kWh/m³

### Readings Schedule
Both contracts have monthly readings from January 1, 2024, to December 31, 2024, allowing you to:
- Test projection calculations
- Verify seasonal weighting for gas
- Check price and payment history features
- Analyze cost optimization recommendations

## Verifying the Seed

After running the seed, you can verify the data:

1. Check contracts:
   ```sql
   SELECT * FROM contracts;
   ```

2. Check readings:
   ```sql
   SELECT * FROM readings ORDER BY date;
   ```

3. Check price history:
   ```sql
   SELECT * FROM contract_prices ORDER BY valid_from;
   ```

4. Check payment history:
   ```sql
   SELECT * FROM contract_payments ORDER BY valid_from;
   ```

## Next Steps

After seeding:
1. Login to your app with the test user credentials
2. View the dashboard to see the seeded contracts
3. Add new readings or modify existing data
4. Test the cost projection and optimization features
