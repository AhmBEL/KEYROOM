import { CATEGORY_LABEL, type DocRow } from "@/lib/deal";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function DocCard({ doc, mine, children }: { doc: DocRow; mine: boolean; children?: React.ReactNode }) {
  const state = doc.category === "accord_genere" || doc.category === "accord_signe"
    ? "Visible par les trois parties"
    : mine ? (doc.shared_with_other_party ? "Partagé" : "Visible par vous seul") : "Partagé avec vous";
  return (
    <article className="kr-card">
      <p className="kr-card__ref">{CATEGORY_LABEL[doc.category] ?? doc.category}</p>
      <h3 className="kr-title-3">{doc.filename}</h3>
      <p className="kr-small">{fmt(doc.created_at)} · {state}</p>
      <a className="kr-btn kr-btn--outline" href={`/dossier/documents/${doc.id}`} target="_blank" rel="noopener">Ouvrir le document</a>
      {children}
    </article>
  );
}
