"use server";

import { requireAdmin } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeLoginLink } from "@/lib/loginlink";

export type InviteState = { ok: boolean; message: string; link?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["partie_mandat", "partie_investisseurs"] as const;
type PartyRole = (typeof ROLES)[number];

const fail = (message: string): InviteState => ({ ok: false, message });

// Invite une partie. Le contrôle admin se fait côté serveur ; la clé service_role
// ne quitte jamais ce fichier.
export async function inviteParty(_prev: InviteState, form: FormData): Promise<InviteState> {
  const { user: caller } = await requireAdmin();

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const prenom = String(form.get("prenom") ?? "").trim();
  const nom = String(form.get("nom") ?? "").trim();
  const role = String(form.get("role") ?? "") as PartyRole;
  const dealChoice = String(form.get("deal") ?? "new");
  // Case décochée = test : le compte est créé sans envoyer d'email, et un lien de connexion est donné à l'admin.
  const sendEmail = form.get("send_email") === "on";

  if (!EMAIL_RE.test(email) || email.length > 254) return fail("Cette adresse email n'est pas valide.");
  if (!prenom || prenom.length > 80 || !nom || nom.length > 80) return fail("Indiquez un prénom et un nom (80 caractères au plus).");
  if (!ROLES.includes(role)) return fail("Choisissez la partie : mandat ou investisseurs.");
  if (dealChoice !== "new" && !UUID_RE.test(dealChoice)) return fail("Dossier inconnu.");

  const admin = createAdminClient();

  if (dealChoice !== "new") {
    const { data: taken } = await admin.from("deal_members").select("user_id").eq("deal_id", dealChoice).eq("role", role).maybeSingle();
    if (taken) return fail("Ce dossier a déjà une partie de ce type. Choisissez un autre dossier ou créez-en un nouveau.");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const created = sendEmail
    ? await admin.auth.admin.inviteUserByEmail(email, { data: { prenom, nom }, redirectTo: site ? `${site}/connexion` : undefined })
    : await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { prenom, nom } });
  const invited = created.data;
  const inviteError = created.error;
  if (inviteError || !invited?.user) {
    const exists = inviteError?.code === "email_exists" || /already|registered/i.test(inviteError?.message ?? "");
    return fail(exists ? "Cette adresse a déjà un compte." : sendEmail
      ? "L'invitation n'a pas pu être envoyée. Vérifiez l'adresse et la configuration email, puis réessayez."
      : "Le compte n'a pas pu être créé. Vérifiez l'adresse, puis réessayez.");
  }
  const userId = invited.user.id;
  let createdDealId: string | null = null;

  try {
    const { error: pErr } = await admin.from("profiles").insert({ id: userId, prenom, nom, role });
    if (pErr) throw pErr;

    let dealId = dealChoice;
    if (dealChoice === "new") {
      const { data: deal, error: dErr } = await admin.rpc("create_deal", { p_created_by: caller.id });
      if (dErr || !deal) throw dErr ?? new Error("create_deal");
      dealId = (deal as { id: string }).id;
      createdDealId = dealId;
    }

    const { error: mErr } = await admin.from("deal_members").insert({ deal_id: dealId, user_id: userId, role });
    if (mErr) throw mErr;

    await admin.from("audit_log").insert({
      deal_id: dealId,
      user_id: caller.id,
      action: "invitation",
      details: { email, role, email_envoye: sendEmail },
    });
    if (sendEmail) return { ok: true, message: `Invitation envoyée à ${email}.` };
    const link = await makeLoginLink(admin, email);
    if ("error" in link) return { ok: true, message: `Compte créé pour ${email}, sans email. ${link.error} Utilisez « Générer un lien de connexion » dans le dossier.` };
    await admin.from("audit_log").insert({ deal_id: dealId, user_id: caller.id, action: "lien_connexion_genere", details: { email } });
    return { ok: true, message: `Compte créé pour ${email}, sans email envoyé. Transmettez-lui ce lien de connexion.`, link: link.path };
  } catch {
    // Retour arrière : aucun compte à moitié créé.
    if (createdDealId) await admin.from("deals").delete().eq("id", createdDealId);
    await admin.auth.admin.deleteUser(userId);
    return fail("L'invitation a échoué avant la fin. Rien n'a été créé. Réessayez.");
  }
}
