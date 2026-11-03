// Vérifie que chaque texte du questionnaire a sa traduction anglaise.
import { blocksFor } from "../lib/questionnaire";
import { hasEn } from "../lib/i18n";

const missing = new Set<string>();
for (const role of ["partie_mandat", "partie_investisseurs"] as const) {
  for (const b of blocksFor(role)) {
    const texts = [b.title, b.intro, ...b.questions.flatMap((q) => [q.label, q.hint, ...("options" in q ? q.options : [])])];
    for (const t of texts) if (t && !hasEn(t)) missing.add(t);
  }
}
if (missing.size) {
  console.error("Traductions manquantes :\n- " + [...missing].join("\n- "));
  process.exit(1);
}
console.log("OK : tous les textes des questionnaires sont traduits.");
