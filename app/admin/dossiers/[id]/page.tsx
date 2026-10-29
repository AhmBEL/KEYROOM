import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Steps } from "@/components/Steps";
import { DocCard } from "@/components/DocCard";
import { Recap } from "@/components/Recap";
import { AdminAction } from "@/components/AdminAction";
import { UploadForm } from "@/components/UploadForm";
import { requireAdmin } from "@/lib/session";
import { getDocuments, getSteps } from "@/lib/deal";
import type { Answers } from "@/lib/questionnaire";
import { advanceStep, generateAccord, setShared } from "../actions";
import { SettingsForm } from "../SettingsForm";

export const metadata = { title: "Dossier — Keyroom" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_LABEL: Record<string, string> = { partie_mandat: "Partie mandat", partie_investisseurs: "Partie investisseurs" };
const ACTION_LABEL: Record<string, string> = {
  connexion: "Connexion", depot: "Dépôt", signature_deposee: "Accord signé déposé", document_consulte: "Document consulté",
  etape_modifiee: "Changement d'étape", questionnaire_valide: "Questionnaire validé", accord_genere: "Accord généré",
  document_partage: "Document partagé", partage_retire: "Partage retiré", invitation: "Invitation", dossier_cree: "Dossier créé",
  parametres_accord_modifies: "Paramètres de l'accord modifiés",
};

export default async function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!UUID_RE.test(id)) notFound();

  const { data: deal } = await supabase.from("deals").select("id, reference").eq("id", id).maybeSingle();
  if (!deal) notFound();

  const [steps, docs, { data: members }, { data: people }, { data: responses }, { data: settings }, { data: log }] = await Promise.all([
    getSteps(supabase, id),
    getDocuments(supabase, id),
    supabase.from("deal_members").select("user_id, role").eq("deal_id", id),
    supabase.from("profiles").select("id, prenom, nom"),
    supabase.from("questionnaire_responses").select("user_id, answers, submitted_at").eq("deal_id", id),
    supabase.from("deal_settings").select("*").eq("deal_id", id).maybeSingle(),
    supabase.from("audit_log").select("id, user_id, action, details, created_at").eq("deal_id", id).order("created_at", { ascending: false }).limit(40),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));
  const submittedBoth = (members ?? []).length === 2 && (members ?? []).every((m) => responses?.some((r) => r.user_id === m.user_id && r.submitted_at));
  const current = steps.find((s) => s.status === "current");
  const hasSigned = docs.some((d) => d.category === "accord_signe");

  return (
    <main className="kr-page">
      <Logo width={160} />
      <Link href="/admin" className="kr-link">← Tous les dossiers</Link>
      <h1 className="kr-title-2">Dossier {deal.reference}</h1>
      {(members ?? []).map((m) => <p key={m.user_id} className="kr-small">{ROLE_LABEL[m.role]} : {name.get(m.user_id)}</p>)}

      <h2 className="kr-title-3">Process</h2>
      <Steps steps={steps} showNote={false} />
      {current && <AdminAction action={advanceStep.bind(null, id)} label={`Terminer l'étape ${current.position}`} primary
        confirm={`Terminer l'étape ${current.position} et ouvrir la suivante ?`} />}

      <h2 className="kr-title-3">Questionnaires</h2>
      {(members ?? []).map((m) => {
        const r = responses?.find((x) => x.user_id === m.user_id);
        return (
          <details key={m.user_id} className="kr-details">
            <summary>{ROLE_LABEL[m.role]} : {r?.submitted_at ? "validé" : "pas encore validé"}</summary>
            {r?.submitted_at ? <Recap role={m.role} answers={r.answers as Answers} /> : <p className="kr-small">Aucune réponse validée.</p>}
          </details>
        );
      })}

      <h2 className="kr-title-3">Accord tripartite</h2>
      <SettingsForm dealId={id} settings={settings as never} />
      {!submittedBoth && <p className="kr-hint">Les deux questionnaires doivent être validés pour générer l&rsquo;accord.</p>}
      <AdminAction action={generateAccord.bind(null, id)} label="Générer l'accord en PDF" primary />
      <p className="kr-hint">L&rsquo;accord est envoyé à signer avec l&rsquo;outil de votre choix. Déposez ensuite l&rsquo;exemplaire signé :</p>
      {!hasSigned && <UploadForm dealId={id} category="accord_signe" label="Exemplaire signé" />}

      <h2 className="kr-title-3">Documents</h2>
      {docs.length ? docs.map((d) => (
        <DocCard key={d.id} doc={d} mine={false}>
          {["teaser", "criteres", "autre"].includes(d.category) && (
            <AdminAction action={setShared.bind(null, d.id, !d.shared_with_other_party)}
              label={d.shared_with_other_party ? "Retirer le partage" : "Partager avec l'autre partie"} />
          )}
        </DocCard>
      )) : <p className="kr-body">Aucun document.</p>}

      <h2 className="kr-title-3">Journal d&rsquo;activité</h2>
      <ul className="kr-log">
        {(log ?? []).map((l) => (
          <li key={l.id}>
            <span>{ACTION_LABEL[l.action] ?? l.action}</span>
            <span className="kr-small">{l.user_id ? name.get(l.user_id) : "Système"} · {new Date(l.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
