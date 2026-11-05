// Vérifie les mentions légales : textes FR/EN complets, repères « à compléter » tant que les champs manquent.
import { LEGAL, REQUIRED, legalComplete, legalPublishable, legalSections, type LegalConfig } from "../lib/legal";

let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.error("ÉCHEC :", m); } };
const text = (cfg: LegalConfig, lang: "fr" | "en") => legalSections(cfg).flatMap((s) => [s.title[lang], ...s.paragraphs.map((p) => p[lang])]).join("\n");

const empty = { ...LEGAL, provisional: false, editorName: "", legalForm: "", registration: "", address: "", email: "", publicationDirector: "", databaseRegion: "", governingLaw: "" };
ok(!legalComplete(empty), "champs vides : page incomplète");
ok(/\[à compléter\]/.test(text(empty, "fr")) && /\[to be completed\]/.test(text(empty, "en")), "repères « à compléter » en FR et EN");

// Texte provisoire : aucune identité inventée, aucun repère « à compléter », lien publiable, page non complète.
const prov: LegalConfig = { ...empty, provisional: true };
ok(!legalComplete(prov) && legalPublishable(prov), "provisoire : non complet mais publiable");
for (const lang of ["fr", "en"] as const) {
  const t = text(prov, lang);
  ok(!/\[(à compléter|to be completed)\]/.test(t), `${lang} provisoire : pas de repère « à compléter »`);
  ok(/prochainement|shortly|finalis/i.test(t), `${lang} provisoire : mention « prochainement »`);
}
ok(!legalPublishable(empty), "vide et non provisoire : non publiable");
ok(legalPublishable(LEGAL) && LEGAL.provisional && Object.values({ a: LEGAL.editorName, b: LEGAL.address, c: LEGAL.registration, d: LEGAL.legalForm, e: LEGAL.publicationDirector }).every((x) => x === ""), "configuration réelle : provisoire, aucune identité inventée");

const full: LegalConfig = { ...empty, editorName: "Société Test Ltd", legalForm: "société à responsabilité limitée", registration: "C12345", address: "1 rue du Port, Port-Louis, Maurice",
  email: "contact@test.example", publicationDirector: "Jean Test", databaseRegion: "Union européenne (Francfort)", governingLaw: "le droit de la République de Maurice" };
ok(legalComplete(full), "tous les champs : page complète");
for (const lang of ["fr", "en"] as const) {
  const t = text(full, lang);
  ok(!/\[(à compléter|to be completed)\]/.test(t), `${lang} : aucun repère restant`);
  for (const k of REQUIRED) ok(t.includes(full[k]), `${lang} : « ${k} » affiché`);
  ok(t.includes("C12345") && t.includes("Vercel") && t.includes("Supabase"), `${lang} : immatriculation, hébergeur, base de données`);
}
// particulier : forme juridique et immatriculation facultatives
const person = { ...full, legalForm: "", registration: "" };
ok(legalComplete(person) && !/\bC12345\b/.test(text(person, "fr")) && !/, ,/.test(text(person, "fr")), "particulier : sans forme juridique ni immatriculation");
ok(legalSections(full).length === 8 && legalSections(full).every((s) => s.title.fr && s.title.en && s.paragraphs.every((p) => p.fr && p.en)), "8 sections bilingues");
ok(!/Belhadj|Ahmed/i.test(JSON.stringify(legalSections(full))), "aucun nom propre dans le texte type");
if (fails) { console.error(`${fails} échec(s)`); process.exit(1); }
console.log("OK : mentions légales (contenu bilingue, champs à compléter, cas particulier).");
