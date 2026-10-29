import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client à clé service_role : contourne la RLS. Serveur uniquement (le build échoue
// si ce fichier est importé depuis un composant client).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY est requis côté serveur.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
