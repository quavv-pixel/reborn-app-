#!/usr/bin/env bash
# Tests supabase/schema.sql against a REAL Postgres, no Supabase account
# needed. Creates a throwaway database, loads a tiny Supabase stand-in
# (supabase-shim.sql), loads the schema TWICE (to prove re-running it in the
# SQL Editor is safe), then runs the attack/behaviour checks.
#
# Needs: psql + a Postgres server you can connect to. Point it at one with
# the usual PG* variables, e.g.  PGHOST=localhost PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="reborn_schema_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
export PGOPTIONS='-c client_min_messages=warning'
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f test/db/supabase-shim.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/schema.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/schema.sql
# Show only our ok/FAIL lines (they arrive as NOTICEs); hide query results.
PGOPTIONS='-c client_min_messages=notice' \
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f test/db/schema.test.sql 2>&1 >/dev/null \
  | sed -e 's/^psql:[^ ]* NOTICE:  /  /' -e 's/^psql:[^ ]* ERROR:  /  /'
exit "${PIPESTATUS[0]}"
