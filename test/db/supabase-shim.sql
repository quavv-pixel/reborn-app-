-- The few pieces of Supabase that supabase/schema.sql relies on, recreated
-- on plain Postgres so the schema can be tested without a Supabase account:
-- the anon/authenticated roles, auth.users, and auth.uid() (which on real
-- Supabase reads the signed-in user's id from their login token; here we
-- set it by hand with set_config('request.jwt.claim.sub', ...)).
-- Roles belong to the whole Postgres server, so create them only once.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Like Supabase: table privileges are granted broadly, and Row-Level
-- Security is what actually limits who sees and changes what.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
