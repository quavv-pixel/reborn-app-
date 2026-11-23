-- Attack + behaviour tests for supabase/schema.sql. Run via test/db/run.sh.
-- Every check either passes silently or stops the script with FAIL: ...
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com');

-- Helpers: act as a signed-in user / as a visitor who isn't signed in.
create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false), set_config('role', 'authenticated', false);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false), set_config('role', 'anon', false);
$$;
create function pg_temp.reset() returns void language sql as $$
  select set_config('role', 'postgres', false), set_config('request.jwt.claim.sub', '', false);
$$;
create function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok   %', label;
end $$;
-- Runs a statement and passes only if it raises an error.
create function pg_temp.refused(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok   % (refused: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — expected an error, but it was allowed', label;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

\set QUIET off
\qecho '--- uploads ---'
\set QUIET on
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.ok(push_kv('[{"key":"p:Me:gym-data","value":"v1","t":100}]') = 1, 'a signed-in user can upload');
select pg_temp.ok((select value from kv where key = 'p:Me:gym-data') = 'v1', 'and read it back');
select pg_temp.ok(push_kv('[{"key":"p:Me:gym-data","value":"OLD","t":50}]') = 0, 'an older upload is ignored');
select pg_temp.ok((select value from kv where key = 'p:Me:gym-data') = 'v1', 'value unchanged after the older upload');
select pg_temp.ok(push_kv('[{"key":"p:Me:gym-data","value":"v2","t":200}]') = 1, 'a newer upload wins');
select pg_temp.ok(push_kv('[{"key":"gone","value":"x","t":1},{"key":"gone","value":null,"t":2}]') = 1, 'same key twice in one upload: newest copy kept');
select pg_temp.ok((select value is null from kv where key = 'gone'), 'tombstone stored as null');

\set QUIET off
\qecho '--- privacy between users ---'
\set QUIET on
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.ok((select count(*) from kv) = 0, 'user B cannot see any of user A''s rows');
select push_kv('[{"key":"p:Me:gym-data","value":"B-data","t":999}]');
select pg_temp.reset();
select pg_temp.ok((select count(*) from kv where key = 'p:Me:gym-data') = 2, 'same key name for two users = two separate rows');
select pg_temp.ok((select value from kv where key = 'p:Me:gym-data' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'v2', 'B''s upload did not touch A''s row');

\set QUIET off
\qecho '--- writes that skip push_kv are refused ---'
\set QUIET on
select count(*) as rows_before from kv \gset
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.refused($$insert into kv (key, value, updated_at_ms) values ('sneaky', 'x', 1)$$, 'direct insert into kv');
update kv set value = 'hacked' where true;
select pg_temp.ok((select count(*) from kv where value = 'hacked') = 0, 'direct update of kv changes nothing');
delete from kv where true;
select pg_temp.reset();
select pg_temp.ok((select count(*) from kv) = :rows_before, 'direct delete of kv removes nothing');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.refused($$insert into entitlements (user_id, active) values ('aaaaaaaa-0000-0000-0000-000000000001', true)$$, 'a user cannot mark themselves as paid');
select pg_temp.as_anon();
select pg_temp.refused($$select push_kv('[{"key":"k","value":"v","t":1}]')$$, 'a visitor who is not signed in cannot upload');
select pg_temp.ok((select count(*) from kv) = 0, 'a visitor who is not signed in sees nothing');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.refused($$select push_kv('"not an array"')$$, 'malformed upload is rejected');
select pg_temp.refused($$select push_kv(('[' || repeat('{"key":"k","value":"v","t":1},', 500) || '{"key":"k","value":"v","t":1}]')::jsonb)$$, 'more than 500 rows at once is rejected');

\set QUIET off
\qecho '--- payment switch ---'
\set QUIET on
select pg_temp.reset();
update app_config set require_payment = true;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.refused($$select push_kv('[{"key":"k","value":"v","t":1}]')$$, 'with payment required, an unpaid user cannot upload');
update app_config set require_payment = false where true;
select pg_temp.reset();
select pg_temp.ok((select require_payment from app_config), 'a user cannot switch the payment requirement off');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.ok((select count(*) from kv) > 0, '...but can still download their existing data');
select pg_temp.reset();
-- What the Stripe webhook does, using the service role key:
set role service_role;
insert into entitlements (user_id, active, status) values ('aaaaaaaa-0000-0000-0000-000000000001', true, 'active');
select pg_temp.reset();
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.ok(push_kv('[{"key":"k","value":"v","t":1}]') = 1, 'once paid, uploads work again');
select pg_temp.ok((select active from entitlements) = true, 'a user can read their own plan');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.ok((select count(*) from entitlements) = 0, 'user B cannot see user A''s plan');
update entitlements set active = true where true;
select pg_temp.refused($$insert into entitlements (user_id, active) values ('bbbbbbbb-0000-0000-0000-000000000002', true)$$, 'user B cannot add a paid plan for themselves');
select pg_temp.refused($$select push_kv('[{"key":"k","value":"v","t":1}]')$$, 'user B is still unpaid after trying to edit plans');
select pg_temp.reset();

\set QUIET off
\qecho '--- deleting an account removes its data ---'
\set QUIET on
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.ok((select count(*) from kv where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0, 'kv rows removed with the account');
select pg_temp.ok((select count(*) from entitlements) = 0, 'plan row removed with the account');

\qecho 'all database checks passed'
