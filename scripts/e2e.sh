#!/usr/bin/env bash
# Tests de bout en bout sans accès à Supabase : un faux serveur (comptes, base, stockage) remplace le vrai.
# Vérifie le code de l'application (invitation sans email, lien de connexion, questionnaire, accord PDF,
# dépôts, étapes). Les règles d'accès (RLS) sont vérifiées à part par `npm run test:rls`.
# Nécessite le module Playwright (NODE_PATH peut pointer vers son installation globale).
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-test SUPABASE_SERVICE_ROLE_KEY=svc-test NEXT_PUBLIC_SITE_URL=http://localhost:3111
npm run build >/dev/null
TMP=$(mktemp -d)
cleanup() { [ -f "$TMP/fake.pid" ] && kill "$(cat "$TMP/fake.pid")" 2>/dev/null || true; [ -f "$TMP/next.pid" ] && kill "$(cat "$TMP/next.pid")" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT
for t in invite-login dossier demo demo2; do
  node scripts/e2e/fake-supabase.cjs >"$TMP/fake.log" 2>&1 & echo $! >"$TMP/fake.pid"
  npx next start -p 3111 >"$TMP/next.log" 2>&1 & echo $! >"$TMP/next.pid"
  sleep 5
  [ "${NODE_PATH:-}" ] || export NODE_PATH="$(npm root -g)"
  node "scripts/e2e/$t.e2e.cjs"
  kill "$(cat "$TMP/fake.pid")" "$(cat "$TMP/next.pid")" 2>/dev/null || true; sleep 1
done
