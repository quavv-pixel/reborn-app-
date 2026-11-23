-- REBORN cloud database. Paste this whole file into Supabase:
--   your project -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement checks before creating).
--
-- What's here:
--   kv            one row per saved item per user (e.g. "p:Me:gym-data")
--   entitlements  who has paid (written only by the Stripe webhook)
--   app_config    one switch: does cloud sync require payment yet?
--   can_sync()    true if this user may upload
--   push_kv()     the ONLY way to write to kv. Enforces "newer wins" and
--                 the payment switch on the server, where users can't skip it.
--
-- Security model: Row-Level Security (RLS) is on for every table. The app
-- ships a public "anon" key; RLS is what stops user A reading user B's rows
-- even if they edit the app's code. auth.uid() is the signed-in user's id,
-- taken from their login token — it can't be faked from the browser.

-- ---------------------------------------------------------------- kv -------
create table if not exists public.kv (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 200),
  value text check (value is null or octet_length(value) <= 2000000), -- null = deleted
  updated_at_ms bigint not null,              -- the device's clock at the edit
  server_updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.kv enable row level security;

drop policy if exists "kv: read own rows" on public.kv;
create policy "kv: read own rows" on public.kv
  for select to authenticated using (auth.uid() = user_id);
-- Deliberately NO insert/update/delete policies: direct writes are refused.
-- All writes go through push_kv() below.

-- ------------------------------------------------------- app_config -------
create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),     -- exactly one row
  require_payment boolean not null default false   -- flip to true when Stripe is live
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;
alter table public.app_config enable row level security;
drop policy if exists "app_config: signed-in users can read" on public.app_config;
create policy "app_config: signed-in users can read" on public.app_config
  for select to authenticated using (true);

-- ----------------------------------------------------- entitlements -------
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active boolean not null default false,
  status text,                                  -- Stripe's status: active, past_due, canceled...
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "entitlements: read own" on public.entitlements;
create policy "entitlements: read own" on public.entitlements
  for select to authenticated using (auth.uid() = user_id);
-- No write policies: only the server-side webhook (service role key, which
-- bypasses RLS) can mark someone as paid.

-- ------------------------------------------------------- functions --------
create or replace function public.can_sync()
returns boolean
language sql stable security definer set search_path = public
as $$
  select not coalesce((select require_payment from app_config where id = 1), false)
      or exists (select 1 from entitlements where user_id = auth.uid() and active);
$$;

-- rows: [{ "key": "...", "value": "..." | null, "t": 1732300000000 }, ...]
create or replace function public.push_kv(rows jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not can_sync() then
    raise exception 'cloud sync needs an active subscription' using errcode = 'P0001', hint = 'upgrade';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 500 then
    raise exception 'rows must be an array of at most 500 items';
  end if;

  insert into kv (user_id, key, value, updated_at_ms)
  select auth.uid(), r ->> 'key', r ->> 'value', (r ->> 't')::bigint
  from jsonb_array_elements(rows) as r
  on conflict (user_id, key) do update
    set value = excluded.value,
        updated_at_ms = excluded.updated_at_ms,
        server_updated_at = now()
    -- "newer wins": an older edit arriving late never overwrites a newer one.
    where kv.updated_at_ms < excluded.updated_at_ms;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.push_kv(jsonb) from public, anon;
grant execute on function public.push_kv(jsonb) to authenticated;
revoke all on function public.can_sync() from public, anon;
grant execute on function public.can_sync() to authenticated;
