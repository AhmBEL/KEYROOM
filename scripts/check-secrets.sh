#!/usr/bin/env bash
# Vérifie qu'aucune clé n'est dans le dépôt ni dans le code envoyé au navigateur.
# À lancer après `npm run build`.
set -uo pipefail
cd "$(dirname "$0")/.."
bad=0
if git grep -n -E "eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_|service_role.{0,5}[:=] *['\"][A-Za-z0-9]" -- . ':!package-lock.json' ':!scripts/check-secrets.sh' ':!supabase/tests' >/dev/null; then
  echo "Clé probable trouvée dans le dépôt :"; git grep -n -E "eyJ[A-Za-z0-9_-]{20,}\.|sb_secret_" -- . ':!package-lock.json' ':!scripts/check-secrets.sh'; bad=1
fi
if [ -d .next/static ] && grep -rIl -E "SUPABASE_SERVICE_ROLE_KEY|service_role" .next/static >/dev/null 2>&1; then
  echo "service_role apparaît dans le code envoyé au navigateur :"; grep -rIl -E "SUPABASE_SERVICE_ROLE_KEY|service_role" .next/static; bad=1
fi
[ $bad = 0 ] && echo "OK : aucune clé dans le dépôt ni dans le code navigateur."
exit $bad
