-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run
-- Extends supabase-setup.sql (run that first if you haven't).
--
-- These tables mirror the collections already stored inside the
-- "businesses.data" JSON blob, but as normal queryable rows — useful if
-- you ever want to run SQL reports, connect a BI tool, or build features
-- that need to query across businesses/customers directly instead of
-- loading a whole business's JSON at once.
--
-- Each table matches the shape SakeBooks already uses internally, keyed
-- by the same ids the app generates (e.g. "cus_...", "inv_...").

create table if not exists customers (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  number text,
  customer_id text,
  date date,
  due_date date,
  status text,
  items jsonb,
  total numeric,
  updated_at timestamptz default now()
);

create table if not exists expenses (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  amount numeric,
  category text,
  method text,
  vendor text,
  recurring boolean,
  updated_at timestamptz default now()
);

create table if not exists assets (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  category text,
  value numeric,
  purchase_date date,
  updated_at timestamptz default now()
);

-- "transactions" = income entries not tied to an invoice (other income,
-- bank/MoMo import matches) — expenses have their own table above, so
-- together expenses + transactions + invoices form the full ledger.
create table if not exists transactions (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  amount numeric,
  description text,
  method text,
  updated_at timestamptz default now()
);

-- Saved snapshots each time a report is exported (CSV/PDF), so you keep
-- a record of what was generated and when, separate from the live data.
create table if not exists reports (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  summary jsonb,
  generated_at timestamptz default now()
);

alter table customers enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table assets enable row level security;
alter table transactions enable row level security;
alter table reports enable row level security;

create policy "Users manage their own customers" on customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own invoices" on invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own assets" on assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own reports" on reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists customers_business_idx on customers(business_id);
create index if not exists invoices_business_idx on invoices(business_id);
create index if not exists expenses_business_idx on expenses(business_id);
create index if not exists assets_business_idx on assets(business_id);
create index if not exists transactions_business_idx on transactions(business_id);
create index if not exists reports_business_idx on reports(business_id);
