#!/usr/bin/env bash
# Lance un Postgres jetable, applique les migrations et exécute le test RLS.
# Aucun accès à votre projet Supabase : tout reste en local.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v initdb >/dev/null 2>&1; then
  PGBIN=$(dirname "$(command -v initdb)")
else
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
fi
[ -x "$PGBIN/initdb" ] || { echo "Postgres introuvable (installez postgresql ou ajoutez-le au PATH)"; exit 1; }

TMP=$(mktemp -d)
PORT=${TEST_PGPORT:-54329}
RUN=""
if [ "$(id -u)" = 0 ]; then RUN="runuser -u postgres --"; chown postgres "$TMP"; fi
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

$RUN "$PGBIN/initdb" -D "$TMP/data" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=127.0.0.1" -l "$TMP/log" -w start >/dev/null

export DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/postgres"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/stubs.sql
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
node --test supabase/tests/rls.test.mjs
