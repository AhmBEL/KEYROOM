import { recapRows, TXT, type Stored } from "@/lib/formdef";

// Réponses d'un questionnaire public, lues en français quelle que soit la langue de la personne.
export function RecapV2({ stored }: { stored: Stored }) {
  const rows = recapRows(stored, "fr");
  const sections = [...new Set(rows.map((r) => r.section))];
  const t = TXT.fr;
  return (
    <div className="kr-recap">
      {sections.map((s) => (
        <section key={s} className="kr-card">
          <h3 className="kr-title-3">{s}</h3>
          <dl className="kr-dl">
            {rows.filter((r) => r.section === s).map((r) => (
              <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
            ))}
          </dl>
        </section>
      ))}
      <section className="kr-card">
        <h3 className="kr-title-3">{t.declarations}</h3>
        <ul className="kr-log">{stored.declarations.map((d) => <li key={d.id}><span>✓ {d.label}</span></li>)}</ul>
      </section>
    </div>
  );
}
