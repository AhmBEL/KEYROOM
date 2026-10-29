import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "./env";

// Client lié à la session de l'utilisateur : les règles RLS s'appliquent.
export async function createClient() {
  const store = await cookies();
  const { url, anonKey } = publicEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Appelé depuis un composant serveur : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}
