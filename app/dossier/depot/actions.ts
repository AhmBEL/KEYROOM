"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceDeal } from "@/lib/advance";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/deal";

export type UploadInput = { dealId: string; category: string; mime: string; size: number };
type Prepared = { ok: true; path: string; token: string } | { ok: false; message: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`, "i");

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type Auth = { ok: false; error: string } | { ok: true; session: Session; isAdmin: boolean };

// Qui peut déposer quoi. La RLS refait ce contrôle à l'écriture de la ligne `documents`.
async function authorize(dealId: string, category: string): Promise<Auth> {
  const session = await getSession();
  if (!session?.profile) return { ok: false, error: "Votre session a expiré. Reconnectez-vous, puis recommencez." };
  if (!UUID_RE.test(dealId)) return { ok: false, error: "Dossier inconnu." };
  const { supabase, user, profile } = session;

  if (profile.role === "admin") {
    if (category !== "accord_signe" && category !== "autre") return { ok: false, error: "Catégorie non autorisée." };
    return { ok: true, session, isAdmin: true };
  }
  const { data: member } = await supabase
    .from("deal_members").select("role").eq("deal_id", dealId).eq("user_id", user.id).maybeSingle();
  if (!member) return { ok: false, error: "Ce dossier ne vous est pas rattaché." };
  const own = member.role === "partie_mandat" ? "teaser" : "criteres";
  if (category !== own && category !== "autre") return { ok: false, error: "Cette catégorie n'est pas disponible pour vous." };
  return { ok: true, session, isAdmin: false };
}

function checkFile(mime: string, size: number): string | null {
  if (!ALLOWED_MIME[mime]) return "Ce format n'est pas accepté. Utilisez un PDF, un DOCX, un JPG ou un PNG.";
  if (!Number.isFinite(size) || size < 1) return "Le fichier est vide.";
  if (size > MAX_BYTES) return "Ce fichier dépasse 20 Mo. Réduisez-le, puis recommencez.";
  return null;
}

// Étape 1 : le serveur contrôle les droits puis donne une adresse d'envoi à usage unique.
// Le fichier part directement vers le stockage (évite la limite de taille des fonctions).
export async function prepareUpload(input: UploadInput): Promise<Prepared> {
  const auth = await authorize(input.dealId, input.category);
  if (!auth.ok) return { ok: false, message: auth.error };
  const bad = checkFile(input.mime, input.size);
  if (bad) return { ok: false, message: bad };

  const path = `${input.dealId}/${input.category}/${randomUUID()}.${ALLOWED_MIME[input.mime]}`;
  const { data, error } = await createAdminClient().storage.from("dossiers").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "L'envoi n'a pas pu démarrer. Réessayez." };
  return { ok: true, path, token: data.token };
}

// Étape 2 : une fois le fichier envoyé, on enregistre le dépôt (sous contrôle RLS) et on le journalise.
export async function finalizeUpload(input: UploadInput & { path: string; filename: string }): Promise<{ ok: boolean; message?: string }> {
  const auth = await authorize(input.dealId, input.category);
  if (!auth.ok) return { ok: false, message: auth.error };
  const bad = checkFile(input.mime, input.size);
  if (bad) return { ok: false, message: bad };

  const pathRe = new RegExp(`^${input.dealId}/${input.category}/${UUID}\\.${ALLOWED_MIME[input.mime]}$`, "i");
  if (!pathRe.test(input.path)) return { ok: false, message: "Chemin de fichier invalide." };

  const admin = createAdminClient();
  const { data: exists } = await admin.storage.from("dossiers").exists(input.path);
  if (!exists) return { ok: false, message: "Le fichier n'est pas arrivé. Réessayez l'envoi." };

  const filename = input.filename.replace(/[\\/\u0000-\u001f]/g, " ").trim().slice(0, 255) || "document";
  const { supabase, user } = auth.session;
  const { error } = await supabase.from("documents").insert({
    deal_id: input.dealId, uploaded_by: user.id, category: input.category, storage_path: input.path,
    filename, mime_type: input.mime, size_bytes: input.size,
  });
  if (error) {
    await admin.storage.from("dossiers").remove([input.path]);
    return { ok: false, message: "Le dépôt n'a pas été accepté. Vérifiez la catégorie et réessayez." };
  }

  const isSigned = input.category === "accord_signe";
  await admin.from("audit_log").insert({
    deal_id: input.dealId, user_id: user.id, action: isSigned ? "signature_deposee" : "depot",
    details: { categorie: input.category, fichier: filename },
  });
  if (isSigned && auth.isAdmin) {
    // L'accord signé clôt l'étape 1.
    const { data: s1 } = await supabase.from("deal_steps").select("status").eq("deal_id", input.dealId).eq("position", 1).maybeSingle();
    if (s1?.status === "current") await advanceDeal(supabase, input.dealId);
  }
  revalidatePath("/dossier");
  revalidatePath("/admin/dossiers/" + input.dealId);
  return { ok: true };
}
