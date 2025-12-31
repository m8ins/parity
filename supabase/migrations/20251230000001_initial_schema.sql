-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Contracts Table
create table public.contracts (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null, -- e.g. "Home Electricity", "Gas"
  type text not null check (type in ('electricity', 'gas')),
  provider text,
  start_date date not null,
  end_date date, -- Optional, if contract ended
  
  -- Pricing (deprecated - kept for backwards compatibility, use history tables)
  base_price_monthly numeric not null default 0, -- Grundpreis in Euro/Month
  energy_price_cents_per_kwh numeric not null default 0, -- Arbeitspreis in Cents/kWh
  monthly_payment numeric not null default 0, -- Abschlag in Euro
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  primary key (id)
);

-- Readings Table
create table public.readings (
  id uuid not null default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade not null,
  date date not null,
  value numeric not null, -- Meter reading in kWh or m³
  
  created_at timestamptz default now(),
  
  primary key (id)
);

-- RLS Policies
-- Enable RLS
alter table public.contracts enable row level security;
alter table public.readings enable row level security;

-- Contracts Policies
create policy "Users can view their own contracts" on public.contracts
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own contracts" on public.contracts
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own contracts" on public.contracts
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own contracts" on public.contracts
  for delete using ((select auth.uid()) = user_id);

-- Readings Policies
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
