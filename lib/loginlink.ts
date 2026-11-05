import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lien de connexion à usage unique, généré par l'administrateur (clé service_role, serveur uniquement).
// Il sert aux tests, ou à dépanner une personne qui ne reçoit pas son code. Il donne accès au compte
// de la personne : à transmettre par un canal sûr. Valable le temps de validité du code (réglage Supabase).
export async function makeLoginLink(admin: SupabaseClient, email: string): Promise<{ path: string } | { error: string }> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return { error: "Le lien de connexion n'a pas pu être créé. Réessayez." };
  return { path: `/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=magiclink` };
}
