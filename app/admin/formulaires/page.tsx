import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/session";
import { display, type Answers } from "@/lib/questionnaire";
import type { Stored } from "@/lib/formdef";

export const metadata = { title: "Formulaires reçus — Keyroom" };
const FORM_LABEL: Record<string, string> = { mandat: "Partie mandat", investisseurs: "Partie investisseurs" };
// Les réponses reçues avant la mise à jour (v1) restent lisibles ; les nouvelles (v2) ont un identifiant par choix.
const isV2 = (a: unknown): a is Stored => typeof a === "object" && a !== null && (a as Stored).v === 2;
function summary(a: unknown) {
  if (isV2(a)) {
    const v = (k: string) => { const f = a.fields[k]; return f && "value" in f ? f.value : ""; };
    const name = v("signer_name") || [v("first_name"), v("last_name")].filter(Boolean).join(" ") || "Sans nom";
    const org = v("company_name") || (a.fields.acting && "id" in a.fields.acting && a.fields.acting.id === "part" ? "Particulier" : "");
    return { name, line: [org, v("company_country")].filter(Boolean).join(" · ") };
  }
  const o = a as Answers;
  return { name: display(o.nom_prenom) || "Sans nom", line: [display(o.raison_sociale), display(o.pays)].filter(Boolean).join(" · ") };
}
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export default async function FormulairesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("form_submissions").select("id, form, lang, answers, created_at").order("created_at", { ascending: false }).limit(300);
  const rows = data ?? [];
  const count = (f: string) => rows.filter((r) => r.form === f && isV2(r.answers)).length;

  return (
    <main className="kr-page">
      <Logo width={160} />
      <Link href="/admin" className="kr-link">← Administration</Link>
      <h1 className="kr-title-2">Formulaires reçus</h1>

      <h2 className="kr-title-3">Liens à partager</h2>
      <p className="kr-small">Ajoutez <code>?lang=en</code> pour ouvrir directement la version anglaise. Sans cela, la langue du navigateur est utilisée.</p>
      <ul className="kr-log">
        <li><span>Choix du formulaire</span><span className="kr-small">/formulaire</span></li>
        <li><span>Partie mandat</span><span className="kr-small">/formulaire/mandat</span></li>
        <li><span>Partie investisseurs</span><span className="kr-small">/formulaire/investisseurs</span></li>
      </ul>

      <h2 className="kr-title-3">Exporter</h2>
      <div className="kr-form">
        <a className="kr-btn kr-btn--outline" href="/admin/formulaires/export?form=mandat">Exporter les mandats (CSV) · {count("mandat")}</a>
        <a className="kr-btn kr-btn--outline" href="/admin/formulaires/export?form=investisseurs">Exporter les investisseurs (CSV) · {count("investisseurs")}</a>
      </div>

      <h2 className="kr-title-3">Réponses ({rows.length})</h2>
      {rows.length ? rows.map((r) => {
        const { name, line } = summary(r.answers);
        return (
          <section key={r.id} className="kr-card">
            <p className="kr-card__ref">{FORM_LABEL[r.form]} · {r.lang === "en" ? "anglais" : "français"}{isV2(r.answers) ? "" : " · ancien format"}</p>
            <h3 className="kr-title-3">{name}</h3>
            <p className="kr-small">{line}</p>
            <p className="kr-small">{fmt(r.created_at)}</p>
            <Link className="kr-btn kr-btn--outline" href={`/admin/formulaires/${r.id}`}>Voir les réponses</Link>
          </section>
        );
      }) : <p className="kr-body">Aucune réponse pour le moment.</p>}
    </main>
  );
}
