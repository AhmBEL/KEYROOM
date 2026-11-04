// Vérifie la définition des questionnaires publics : textes bilingues complets, identifiants uniques,
// logique conditionnelle, validation côté serveur et absence de nom propre.
import { allFields, sectionsFor, validateForm, toStored, recapText, progress, STEPS, TXT, type FormRole } from "../lib/formdef";

let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.error("ÉCHEC :", m); } };

for (const role of ["mandat", "investisseurs"] as FormRole[]) {
  const secs = sectionsFor(role);
  ok(secs.length === 5, `${role} : 5 sections`);
  const ids = new Set<string>();
  for (const f of secs.flatMap((s) => s.fields)) {
    ok(!ids.has(f.id), `${role} : identifiant unique ${f.id}`); ids.add(f.id);
    if (f.kind === "single") {
      const oi = new Set(f.options.map((x) => x.id));
      ok(oi.size === f.options.length, `${role}/${f.id} : identifiants d'options uniques`);
      for (const x of f.options) ok(x.label.fr.trim() && x.label.en.trim() && x.label.fr !== x.label.en || ["oui", "non", "email", "whatsapp", "yes"].includes(x.id) || x.label.en.trim() !== "", `${role}/${f.id}/${x.id} : traduction`);
    }
    const texts = f.kind === "note" ? [f.text] : f.kind === "flow" ? [] : [f.label, ...(f.kind !== "single" && f.help ? [f.help] : [])];
    for (const l of texts) ok(l.fr.trim() && l.en.trim(), `${role}/${f.id} : texte FR et EN`);
  }
  for (const s of secs) { ok(s.title.fr && s.title.en && s.intro.fr && s.intro.en, `${role}/${s.id} : titre et intro FR/EN`); }
  ok(secs[4].checks?.length === 4, `${role} : 4 déclarations`);
  const blob = JSON.stringify(secs) + JSON.stringify(STEPS) + JSON.stringify(TXT.fr) + JSON.stringify(TXT.en);
  ok(!/Ahmed|Belhadj/i.test(blob), `${role} : aucun nom propre`);
  ok(/apporteur d'affaires/.test(blob) && /business introducer/.test(blob), `${role} : terme neutre présent`);
  ok(/une à deux minutes/.test(TXT.fr.intro) && /one to two minutes/.test(TXT.en.intro), "durée 1 à 2 minutes");
}
ok(STEPS.length === 10 && new Set(STEPS.map((x) => x.n)).size === 9, "9 étapes (l'étape 2 existe des deux côtés)");
ok(!/non-contournement|commission|middleman/i.test(JSON.stringify(STEPS)), "étape 1 sans commission ni non-contournement ; pas de « middleman »");
ok(/signé par les trois parties/i.test(STEPS[0].sub.fr) && /accord sur le déroulé/i.test(STEPS[0].sub.fr), "étape 1 : signé par les trois, accord sur le déroulé");

// Scénario mandat, société, non rémunéré
const base = { acting: "soc", company_name: "Hôtels Océan Ltd", company_type: "Ltd", company_country: "Maurice", company_address: "1 rue X, Port-Louis",
  signer_name: "Marie Mandat", signer_role: "directrice", email: "marie@test.com", phone: "+230 5 123 4567",
  mandates_signed: "all_written", can_present: "yes_all", authority: "nda", paid: "non_paye", share_ok: "oui", agree_process: "oui" };
const allD = { d1: true, d2: true, d3: true, d4: true };
let v = validateForm("mandat", "en", base, allD);
ok(Object.keys(v.errors).length === 0, "mandat complet valide : " + JSON.stringify(v.errors));
// déclarations manquantes
v = validateForm("mandat", "fr", base, { d1: true, d2: true, d3: true });
ok(v.errors.declarations === TXT.fr.errDecl, "4 cases obligatoires");
// payé : la question de partage n'est ni obligatoire ni enregistrée
v = validateForm("mandat", "fr", { ...base, paid: "paye", share_ok: "non" }, allD);
ok(Object.keys(v.errors).length === 0 && !("share_ok" in v.answers), "paye → partage non demandé ni enregistré");
v = validateForm("mandat", "fr", { ...base, share_ok: undefined }, allD);
ok(!!v.errors.share_ok, "non_paye → partage obligatoire");
// particulier : champs société écartés, champs particulier requis
v = validateForm("mandat", "fr", { ...base, acting: "part" }, allD);
ok(!("company_name" in v.answers) && !!v.errors.first_name && !!v.errors.home_address, "particulier : champs société retirés, prénom/adresse requis");
// identifiant inconnu ignoré, libellé jamais accepté à la place de l'id
v = validateForm("mandat", "fr", { ...base, authority: "Jusqu'à la signature d'un accord de confidentialité (NDA)" }, allD);
ok(!!v.errors.authority, "un libellé n'est pas un identifiant");
v = validateForm("mandat", "fr", { ...base, email: "pas-un-email", phone: "abc" }, allD);
ok(!!v.errors.email && !!v.errors.phone, "email et téléphone contrôlés");

// Enregistré : identifiant + libellé dans la langue choisie + langue + date + déclarations
const clean = validateForm("mandat", "en", base, allD).answers;
const st = toStored("mandat", "en", clean, "2026-11-04T16:36:00.000Z");
ok(st.lang === "en" && st.v === 2 && st.declarations.length === 4 && st.validated_at.startsWith("2026-11-04"), "enregistrement : lang, date, déclarations");
const au = st.fields.authority as { id: string; label: string };
ok(au.id === "nda" && /confidentiality agreement/.test(au.label), "id + libellé anglais");
ok(/l'accord du propriétaire est requis/.test(recapText(st, "fr")), "récapitulatif retraduit en français depuis les identifiants");
ok(/Up to the signing of a confidentiality agreement/.test(recapText(st, "en")), "récapitulatif en anglais");
ok(!/Ahmed|Belhadj/i.test(recapText(st, "fr") + recapText(st, "en")), "récapitulatif sans nom propre");
// investisseurs : libellés adaptés
const inv = allFields("investisseurs").find((f) => f.id === "authority");
ok(inv?.kind === "single" && /vos investisseurs/.test(inv.options[3].label.fr) && /your investors/i.test(inv.options[3].label.en), "investisseurs : « vos investisseurs »");
const note = allFields("investisseurs").find((f) => f.id === "share_note");
ok(note?.kind === "note" && /détenteur de mandats/.test(note.text.fr) && /mandate holder/.test(note.text.en), "investisseurs : encadré 20/40/40 adapté");
ok(progress("mandat", base, allD).done === progress("mandat", base, allD).total, "progression : tout répondu");

// Moyens de contact : choix multiple facultatif
v = validateForm("mandat", "fr", { ...base, contact_pref: ["whatsapp", "email", "inconnu"] }, allD);
ok(JSON.stringify(v.answers.contact_pref) === JSON.stringify(["email", "whatsapp"]) && Object.keys(v.errors).length === 0, "contact_pref : identifiants connus, dans l'ordre des options");
const st2 = toStored("mandat", "en", v.answers, "2026-11-04T16:36:00.000Z");
const cp = st2.fields.contact_pref as { ids: string[]; labels: string[] };
ok(cp.ids.join() === "email,whatsapp" && cp.labels.join() === "Email,WhatsApp", "contact_pref enregistré (ids + libellés)");
ok(/Email, WhatsApp/.test(recapText(st2, "fr")), "contact_pref dans le récapitulatif");
v = validateForm("mandat", "fr", { ...base, contact_pref: [] }, allD);
ok(!("contact_pref" in v.answers) && Object.keys(v.errors).length === 0, "contact_pref vide : facultatif");
v = validateForm("mandat", "fr", { ...base, contact_pref: "email" }, allD);
ok(!("contact_pref" in v.answers), "contact_pref : une chaîne n'est pas acceptée");
const cpf = allFields("mandat").find((f) => f.id === "contact_pref");
ok(cpf?.kind === "multi", "contact_pref est un choix multiple");

if (fails) { console.error(`${fails} échec(s)`); process.exit(1); }
console.log("OK : questionnaires publics (définition, logique, validation, enregistrement).");
