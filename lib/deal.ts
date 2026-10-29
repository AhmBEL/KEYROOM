import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Step = { position: number; label: string; status: "done" | "current" | "upcoming" };
export type DocRow = {
  id: string; deal_id: string; uploaded_by: string; category: string; filename: string;
  shared_with_other_party: boolean; created_at: string; size_bytes: number;
};

// V1 : une partie suit un seul dossier (le plus ancien). Les règles RLS limitent déjà la lecture.
export async function getMyDeal(supabase: SupabaseClient, userId: string) {
  const { data: member } = await supabase
    .from("deal_members").select("deal_id, role").eq("user_id", userId).limit(1).maybeSingle();
  if (!member) return null;
  const { data: deal } = await supabase.from("deals").select("id, reference").eq("id", member.deal_id).maybeSingle();
  if (!deal) return null;
  return { deal: deal as { id: string; reference: string }, role: member.role as "partie_mandat" | "partie_investisseurs" };
}

export async function getSteps(supabase: SupabaseClient, dealId: string) {
  const { data } = await supabase.from("deal_steps").select("position, label, status").eq("deal_id", dealId).order("position");
  return (data ?? []) as Step[];
}

export async function getDocuments(supabase: SupabaseClient, dealId: string) {
  const { data } = await supabase
    .from("documents")
    .select("id, deal_id, uploaded_by, category, filename, shared_with_other_party, created_at, size_bytes")
    .eq("deal_id", dealId).order("created_at", { ascending: false });
  return (data ?? []) as DocRow[];
}

export const CATEGORY_LABEL: Record<string, string> = {
  accord_genere: "Accord à signer",
  accord_signe: "Accord signé",
  teaser: "Teaser anonyme",
  criteres: "Critères de recherche",
  autre: "Autre document",
};

export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};
export const MAX_BYTES = 20 * 1024 * 1024;

export const STEP_NOTE: Record<number, string> = {
  1: "Répondre au questionnaire, puis signer l'accord.",
  2: "Déposer votre teaser anonyme ou vos critères anonymes.",
};
export const DEFAULT_STEP_NOTE = "Nous vous contactons pour la suite.";
