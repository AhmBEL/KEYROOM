import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Termine l'étape en cours et ouvre la suivante. À appeler avec le client de l'admin :
// la RLS refuse l'écriture à tout autre rôle, et le journal est écrit par un trigger.
export async function advanceDeal(supabase: SupabaseClient, dealId: string): Promise<{ ok: boolean; message: string }> {
  const { data: steps } = await supabase.from("deal_steps").select("position, status").eq("deal_id", dealId).order("position");
  const current = steps?.find((s) => s.status === "current");
  if (!current) return { ok: false, message: "Aucune étape en cours." };
  const done = await supabase.from("deal_steps").update({ status: "done" }).eq("deal_id", dealId).eq("position", current.position).select("position");
  if (done.error || !done.data?.length) return { ok: false, message: "Le changement d'étape a été refusé." };
  if (current.position < 9) {
    const next = await supabase.from("deal_steps").update({ status: "current" }).eq("deal_id", dealId).eq("position", current.position + 1).select("position");
    if (next.error || !next.data?.length) return { ok: false, message: "L'étape suivante n'a pas pu être ouverte." };
  }
  return { ok: true, message: current.position < 9 ? `Étape ${current.position} terminée. L'étape ${current.position + 1} est en cours.` : "Dernière étape terminée." };
}
