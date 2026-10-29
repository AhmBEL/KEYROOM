"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getMyDeal } from "@/lib/deal";
import { sanitizeAnswers } from "@/lib/questionnaire";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitResult = { ok: boolean; message?: string; errors?: Record<string, string> };

export async function submitQuestionnaire(raw: unknown): Promise<SubmitResult> {
  const session = await getSession();
  if (!session?.profile) return { ok: false, message: "Votre session a expiré. Reconnectez-vous, puis recommencez." };
  const { supabase, user } = session;
  const mine = await getMyDeal(supabase, user.id);
  if (!mine) return { ok: false, message: "Aucun dossier ne vous est rattaché." };

  const { answers, errors } = sanitizeAnswers(mine.role, raw);
  if (Object.keys(errors).length) return { ok: false, errors, message: "Certaines réponses obligatoires manquent. Elles sont signalées ci-dessous." };

  const { data: existing } = await supabase
    .from("questionnaire_responses").select("submitted_at").eq("deal_id", mine.deal.id).eq("user_id", user.id).maybeSingle();
  if (existing?.submitted_at) return { ok: false, message: "Vos réponses ont déjà été validées." };

  const row = { answers, submitted_at: new Date().toISOString() };
  const res = existing
    ? await supabase.from("questionnaire_responses").update(row).eq("deal_id", mine.deal.id).eq("user_id", user.id)
    : await supabase.from("questionnaire_responses").insert({ deal_id: mine.deal.id, user_id: user.id, ...row });
  if (res.error) return { ok: false, message: "L'enregistrement a échoué. Vérifiez votre connexion et réessayez." };

  await createAdminClient().from("audit_log").insert({ deal_id: mine.deal.id, user_id: user.id, action: "questionnaire_valide" });
  revalidatePath("/dossier");
  return { ok: true };
}
