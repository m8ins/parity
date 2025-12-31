-- Optimize RLS policies by using (select auth.uid()) instead of auth.uid()
-- This prevents the auth function from being re-evaluated for each row

-- Drop and recreate contracts policies
drop policy if exists "Users can view their own contracts" on public.contracts;
drop policy if exists "Users can insert their own contracts" on public.contracts;
drop policy if exists "Users can update their own contracts" on public.contracts;
drop policy if exists "Users can delete their own contracts" on public.contracts;

create policy "Users can view their own contracts" on public.contracts
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own contracts" on public.contracts
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own contracts" on public.contracts
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own contracts" on public.contracts
  for delete using ((select auth.uid()) = user_id);

-- Drop and recreate readings policies
drop policy if exists "Users can view their own readings" on public.readings;
drop policy if exists "Users can insert their own readings" on public.readings;
drop policy if exists "Users can update their own readings" on public.readings;
drop policy if exists "Users can delete their own readings" on public.readings;

create policy "Users can view their own readings" on public.readings
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = readings.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can insert their own readings" on public.readings
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = readings.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own readings" on public.readings
  for update using (
    exists (
      select 1 from public.contracts c
      where c.id = readings.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own readings" on public.readings
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = readings.contract_id
      and c.user_id = (select auth.uid())
    )
  );

-- Drop and recreate contract_prices policies
drop policy if exists "Users can view their own contract prices" on public.contract_prices;
drop policy if exists "Users can insert their own contract prices" on public.contract_prices;
drop policy if exists "Users can update their own contract prices" on public.contract_prices;
drop policy if exists "Users can delete their own contract prices" on public.contract_prices;

create policy "Users can view their own contract prices" on public.contract_prices
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_prices.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can insert their own contract prices" on public.contract_prices
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_prices.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own contract prices" on public.contract_prices
  for update using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_prices.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own contract prices" on public.contract_prices
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_prices.contract_id
      and c.user_id = (select auth.uid())
    )
  );

-- Drop and recreate contract_payments policies
drop policy if exists "Users can view their own contract payments" on public.contract_payments;
drop policy if exists "Users can insert their own contract payments" on public.contract_payments;
drop policy if exists "Users can update their own contract payments" on public.contract_payments;
drop policy if exists "Users can delete their own contract payments" on public.contract_payments;

create policy "Users can view their own contract payments" on public.contract_payments
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_payments.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can insert their own contract payments" on public.contract_payments
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_payments.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own contract payments" on public.contract_payments
  for update using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_payments.contract_id
      and c.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own contract payments" on public.contract_payments
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_payments.contract_id
      and c.user_id = (select auth.uid())
    )
  );
