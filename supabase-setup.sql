-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run

create table if not exists businesses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  data jsonb,
  updated_at timestamptz default now()
);

alter table businesses enable row level security;

-- Each user can only ever see/edit/delete their own business rows
create policy "Users manage their own businesses"
  on businesses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
