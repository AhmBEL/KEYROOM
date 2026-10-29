"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceDeal } from "@/lib/advance";
import { buildAccordPdf, type AccordSettings } from "@/lib/accord-pdf";
import type { Answers } from "@/lib/questionnaire";

export type ActionResult = { ok: boolean; message: string } | null;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (message: string): ActionResult => ({ ok: false, message });

export async function advanceStep(dealId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!UUID_RE.test(dealId)) return fail("Dossier inconnu.");
  const res = await advanceDeal(supabase, dealId);
  revalidatePath(`/admin/dossiers/${dealId}`);
  return res;
}

export async function setShared(docId: string, shared: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  if (!UUID_RE.test(docId)) return fail("Document inconnu.");
  const { data, error } = await supabase.from("documents").update({ shared_with_other_party: shared }).eq("id", docId).select("deal_id");
  if (error || !data?.length) return fail("Le partage n'a pas pu être modifié.");
  await createAdminClient().from("audit_log").insert({
    deal_id: data[0].deal_id, user_id: user.id, action: shared ? "document_partage" : "partage_retire", details: { document_id: docId },
  });
  revalidatePath(`/admin/dossiers/${data[0].deal_id}`);
  return { ok: true, message: shared ? "Document partagé avec l'autre partie." : "Partage retiré." };
}

export async function updateSettings(dealId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  if (!UUID_RE.test(dealId)) return fail("Dossier inconnu.");
  const droit = String(form.get("droit_applicable"));
  const protection = Number(form.get("duree_protection_mois"));
  const confid = Number(form.get("duree_confidentialite_ans"));
  const rep = { mandat: Number(form.get("mandat")), investisseurs: Number(form.get("investisseurs")), ahmed: Number(form.get("ahmed")) };

  if (droit !== "maurice_arbitrage" && droit !== "anglais") return fail("Choisissez un droit applicable.");
  if (!Number.isInteger(protection) || protection < 12 || protection > 24) return fail("La durée de protection va de 12 à 24 mois.");
  if (!Number.isInteger(confid) || confid < 2 || confid > 5) return fail("La durée de confidentialité va de 2 à 5 ans.");
  if (Object.values(rep).some((v) => !Number.isFinite(v) || v < 0 || v > 100) || rep.mandat + rep.investisseurs + rep.ahmed !== 100) {
    return fail("La répartition doit totaliser 100 %. Corrigez les trois valeurs.");
  }
  const { error, data } = await supabase.from("deal_settings").update({
    droit_applicable: droit, duree_protection_mois: protection, duree_confidentialite_ans: confid, repartition: rep,
  }).eq("deal_id", dealId).select("deal_id");
  if (error || !data?.length) return fail("Les paramètres n'ont pas pu être enregistrés.");
  await createAdminClient().from("audit_log").insert({ deal_id: dealId, user_id: user.id, action: "parametres_accord_modifies" });
  revalidatePath(`/admin/dossiers/${dealId}`);
  return { ok: true, message: "Paramètres enregistrés. Générez l'accord pour les appliquer." };
}

export async function generateAccord(dealId: string): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  if (!UUID_RE.test(dealId)) return fail("Dossier inconnu.");

  const [{ data: deal }, { data: members }, { data: settings }, { data: steps }, { data: responses }] = await Promise.all([
    supabase.from("deals").select("reference").eq("id", dealId).maybeSingle(),
    supabase.from("deal_members").select("user_id, role").eq("deal_id", dealId),
    supabase.from("deal_settings").select("*").eq("deal_id", dealId).maybeSingle(),
    supabase.from("deal_steps").select("label").eq("deal_id", dealId).order("position"),
    supabase.from("questionnaire_responses").select("user_id, answers, submitted_at").eq("deal_id", dealId),
  ]);
  if (!deal || !settings) return fail("Dossier introuvable.");

  const answersOf = (role: string): Answers | null => {
    const m = members?.find((x) => x.role === role);
    const r = responses?.find((x) => x.user_id === m?.user_id && x.submitted_at);
    return (r?.answers as Answers) ?? null;
  };
  const mandat = answersOf("partie_mandat");
  const investisseurs = answersOf("partie_investisseurs");
  if (!mandat || !investisseurs) return fail("Les deux questionnaires doivent être validés avant de générer l'accord.");

  const bytes = await buildAccordPdf({
    reference: deal.reference, generatedAt: new Date(), mandat, investisseurs,
    steps: (steps ?? []).map((s) => s.label),
    settings: settings as unknown as AccordSettings,
  });

  const path = `${dealId}/accord_genere/${randomUUID()}.pdf`;
  const admin = createAdminClient();
  const up = await admin.storage.from("dossiers").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error) return fail("Le PDF n'a pas pu être enregistré. Réessayez.");

  const { error } = await supabase.from("documents").insert({
    deal_id: dealId, uploaded_by: user.id, category: "accord_genere", storage_path: path,
    filename: `Accord ${deal.reference}.pdf`, mime_type: "application/pdf", size_bytes: bytes.length,
  });
  if (error) {
    await admin.storage.from("dossiers").remove([path]);
    return fail("Le PDF a été créé mais n'a pas pu être enregistré. Réessayez.");
  }
  await admin.from("audit_log").insert({ deal_id: dealId, user_id: user.id, action: "accord_genere", details: { fichier: path } });
  revalidatePath(`/admin/dossiers/${dealId}`);
  revalidatePath("/dossier");
  return { ok: true, message: "Accord généré. Les trois parties peuvent l'ouvrir." };
}
