"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeAnswers, type Answers, type Role } from "@/lib/questionnaire";
import { UI, isLang } from "@/lib/i18n";
import type { SubmitMeta, SubmitResult } from "@/components/QuestionnaireForm";

const ROLE: Record<string, Role> = { mandat: "partie_mandat", investisseurs: "partie_investisseurs" };
const MAX_PER_HOUR = 10;
const MIN_FILL_MS = 4000;

// Enregistre un questionnaire public. Aucune connexion : le serveur contrôle tout.
// Les valeurs sont toujours enregistrées en français, quelle que soit la langue affichée.
export async function submitPublicForm(form: string, langRaw: string, raw: Answers, meta: SubmitMeta): Promise<SubmitResult> {
  const lang = isLang(langRaw) ? langRaw : "fr";
  const t = UI[lang];
  const role = ROLE[form];
  if (!role) return { ok: false, message: t.fail };

  // Piège à robots : on répond « ok » sans rien enregistrer.
  if (meta?.hp) return { ok: true };
  const { answers, errors } = sanitizeAnswers(role, raw, lang);
  if (Object.keys(errors).length) return { ok: false, errors, message: t.missing };
  // Un formulaire complet envoyé en quelques secondes n'est pas rempli par une personne.
  if (typeof meta?.elapsed !== "number" || meta.elapsed < MIN_FILL_MS) return { ok: false, message: t.tooFast };

  // Limite par connexion : l'adresse IP n'est jamais enregistrée, seulement une empreinte secrète.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ipHash = ip && key ? createHmac("sha256", key).update(ip).digest("hex").slice(0, 32) : null;

  const admin = createAdminClient();
  if (ipHash) {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("form_submissions").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) return { ok: false, message: t.limit };
  }

  const { error } = await admin.from("form_submissions").insert({ form, lang, answers, ip_hash: ipHash });
  if (error) return { ok: false, message: t.fail };
  return { ok: true };
}
