-- Create Price History Table
create table public.contract_prices (
  id uuid not null default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade not null,
  valid_from date not null,
  base_price_monthly numeric not null default 0,
  energy_price_cents_per_kwh numeric not null default 0,
  created_at timestamptz default now(),
  primary key (id)
);

-- Create Payment History Table
create table public.contract_payments (
  id uuid not null default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete cascade not null,
  valid_from date not null,
  monthly_payment numeric not null default 0,
  created_at timestamptz default now(),
  primary key (id)
);

-- RLS
alter table public.contract_prices enable row level security;
alter table public.contract_payments enable row level security;

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

-- Migration: Copy existing data to history tables
insert into public.contract_prices (contract_id, valid_from, base_price_monthly, energy_price_cents_per_kwh)
select id, start_date, base_price_monthly, energy_price_cents_per_kwh from public.contracts;

insert into public.contract_payments (contract_id, valid_from, monthly_payment)
select id, start_date, monthly_payment from public.contracts;

-- Add monthly_distribution to contracts
alter table public.contracts add column monthly_distribution numeric[] default null;
