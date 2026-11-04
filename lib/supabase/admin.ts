import "server-only";
import { createClient } from "@supabase/supabase-js";

export const KEY_INVALID = "SUPABASE_SERVICE_ROLE_KEY_INVALID";

// Client à clé service_role : contourne la RLS. Serveur uniquement (le build échoue
// si ce fichier est importé depuis un composant client).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Espaces, retours à la ligne et guillemets collés par erreur sont retirés.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY est requis côté serveur.");
  // Une clé copiée masquée ou tronquée (« • », « … ») contient des caractères qu'un en-tête HTTP refuse.
  if (/[^\x21-\x7e]/.test(key)) throw new Error(KEY_INVALID);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
