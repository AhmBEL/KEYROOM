"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordLogin } from "@/app/connexion/actions";

// Ouvre la session à partir d'un lien de connexion généré par l'administrateur.
// Le jeton n'est consommé que par ce clic : un aperçu de lien (messagerie, antivirus) ne l'utilise pas.
export async function confirmLogin(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash) || type !== "magiclink") redirect("/auth/confirm?erreur=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) redirect("/auth/confirm?erreur=1");

  await recordLogin().catch(() => undefined);
  redirect("/dossier");
}
