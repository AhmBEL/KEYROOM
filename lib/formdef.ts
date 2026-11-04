// Questionnaires publics (lien partagé) : définition unique, bilingue, avec identifiants stables.
// La logique conditionnelle et les réponses enregistrées utilisent les identifiants, jamais les libellés.
export type Lang = "fr" | "en";
export type L = Record<Lang, string>;
export type FormRole = "mandat" | "investisseurs";
export type Answers = Record<string, string>;
export type Decl = Record<string, boolean>;

export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";
export const isFormRole = (v: unknown): v is FormRole => v === "mandat" || v === "investisseurs";

type Opt = { id: string; label: L };
type Base = { id: string; showIf?: (a: Answers) => boolean };
export type Field =
  | (Base & { kind: "single"; label: L; options: Opt[]; required?: boolean })
  | (Base & { kind: "text" | "longtext" | "email" | "tel"; label: L; help?: L; required?: boolean; ac?: string })
  | (Base & { kind: "note"; text: L })
  | (Base & { kind: "flow" });
export type Section = { id: string; title: L; intro: L; fields: Field[]; checks?: { id: string; label: L }[]; checksLabel?: L };

const l = (fr: string, en: string): L => ({ fr, en });
const o = (id: string, fr: string, en: string): Opt => ({ id, label: l(fr, en) });
const isSoc = (a: Answers) => a.acting === "soc";
const isPart = (a: Answers) => a.acting === "part";
const YNR = [o("oui", "Oui", "Yes"), o("oui_remarque", "Oui, avec une remarque", "Yes, with a comment"), o("non", "Non", "No")];

export const STEPS: { n: number; label: L }[] = [
  { n: 1, label: l("Accord de commission et de non-contournement, signé par les trois", "Commission and non-circumvention agreement, signed by all three") },
  { n: 2, label: l("Teaser anonyme de l'hôtel, critères anonymes de l'investisseur", "Anonymous hotel teaser, anonymous investor criteria") },
  { n: 3, label: l("Sélection de 2 à 3 hôtels par l'apporteur d'affaires", "Shortlist of 2 to 3 hotels by the business introducer") },
  { n: 4, label: l("NDA signé par les deux côtés", "NDA signed by both sides") },
  { n: 5, label: l("Nom de l'hôtel et chiffres clés", "Hotel name and key figures") },
  { n: 6, label: l("Preuve de fonds et LOI, uniquement sur la sélection", "Proof of funds and LOI, shortlisted hotels only") },
  { n: 7, label: l("MOU avec exclusivité", "MOU with exclusivity") },
  { n: 8, label: l("Documents sensibles, ouverts par paliers", "Sensitive documents, released in stages") },
  { n: 9, label: l("Contrat de vente", "Sale contract") },
];

export function sectionsFor(role: FormRole): Section[] {
  const mandat = role === "mandat";
  // « le propriétaire » côté mandats, « vos investisseurs » côté investisseurs.
  const who = (fr: string, en: string, frInv: string, enInv: string) => (mandat ? l(fr, en) : l(frInv, enInv));

  return [
    {
      id: "who",
      title: l("Qui êtes-vous ?", "Who are you?"),
      intro: l("Pour vous identifier correctement dans l'accord.", "To identify you correctly in the agreement."),
      fields: [
        { id: "acting", kind: "single", required: true, label: l("Vous agissez", "You are acting"),
          options: [o("soc", "En tant que société", "As a company"), o("part", "En tant que particulier", "As an individual")] },
        { id: "company_name", kind: "text", required: true, ac: "organization", showIf: isSoc, label: l("Nom de la société", "Company name") },
        { id: "company_type", kind: "text", required: true, showIf: isSoc, label: l("Type de société", "Company type"), help: l("Ex. SARL, SA, Ltd, LLC", "e.g. Ltd, LLC, SA") },
        { id: "company_country", kind: "text", required: true, ac: "country-name", showIf: isSoc, label: l("Pays où la société est enregistrée", "Country where the company is registered") },
        { id: "company_reg", kind: "text", showIf: isSoc, label: l("Numéro d'enregistrement de la société", "Company registration number"), help: l("Si vous l'avez sous la main", "If you have it at hand") },
        { id: "company_address", kind: "text", required: true, ac: "street-address", showIf: isSoc, label: l("Adresse du siège de la société", "Registered office address"), help: l("Rue, code postal, ville, pays", "Street, postcode, city, country") },
        { id: "signer_name", kind: "text", required: true, ac: "name", showIf: isSoc, label: l("Nom et prénom de la personne qui signe", "Full name of the person signing") },
        { id: "signer_role", kind: "text", required: true, ac: "organization-title", showIf: isSoc, label: l("Sa fonction dans la société", "Their position in the company"), help: l("Ex. gérant, directeur", "e.g. director, manager") },
        { id: "first_name", kind: "text", required: true, ac: "given-name", showIf: isPart, label: l("Prénom", "First name") },
        { id: "last_name", kind: "text", required: true, ac: "family-name", showIf: isPart, label: l("Nom", "Last name") },
        { id: "home_address", kind: "text", required: true, ac: "street-address", showIf: isPart, label: l("Adresse où vous habitez", "Home address"), help: l("Rue, code postal, ville, pays", "Street, postcode, city, country") },
        { id: "email", kind: "email", required: true, ac: "email", label: l("Adresse email", "Email address") },
        { id: "phone", kind: "tel", required: true, ac: "tel", label: l("Numéro de téléphone", "Phone number"), help: l("Avec l'indicatif, ex. +230 5…", "With country code, e.g. +230 5…") },
        { id: "contact_pref", kind: "single", label: l("Le meilleur moyen de vous joindre", "Best way to reach you"),
          options: [o("email", "Email", "Email"), o("phone", "Téléphone", "Phone"), o("whatsapp", "WhatsApp", "WhatsApp")] },
      ],
    },
    {
      id: "activity",
      title: l("Votre activité", "Your activity"),
      intro: l("Deux points pour cadrer.", "Two points to set the scene."),
      fields: [
        ...(mandat
          ? ([
              { id: "mandates_signed", kind: "single", required: true, label: l("Vos mandats signés par les propriétaires sont", "Your mandates signed by the owners are"),
                options: [o("all_written", "Tous par écrit", "All in writing"), o("some_written", "Certains par écrit", "Some in writing"), o("mostly_verbal", "Surtout oraux", "Mostly verbal")] },
              { id: "can_present", kind: "single", required: true, label: l("Vous pouvez présenter vos hôtels à un tiers et à ses investisseurs", "You can present your hotels to a third party and its investors"),
                options: [o("yes_all", "Oui, pour tous", "Yes, for all"), o("yes_owner", "Oui, après accord du propriétaire", "Yes, after the owner's approval"), o("no", "Non", "No")] },
            ] as Field[])
          : ([
              { id: "search_mandate", kind: "single", required: true, label: l("Vous avez un mandat de recherche écrit de vos investisseurs", "You hold a written search mandate from your investors"),
                options: [o("yes_all", "Oui, pour tous", "Yes, for all"), o("some", "Pour certains", "For some"), o("no", "Non", "No")] },
              { id: "can_present", kind: "single", required: true, label: l("Vous pouvez présenter leurs critères à un tiers, sous NDA", "You can present their criteria to a third party, under NDA"),
                options: [o("yes_all", "Oui, pour tous", "Yes, for all"), o("yes_each", "Oui, après accord de chacun", "Yes, after each one's approval"), o("no", "Non", "No")] },
            ] as Field[])),
        { id: "authority", kind: "single", required: true,
          label: who("Jusqu'où pouvez-vous décider seul, ou avec votre associé, sans la validation du propriétaire de l'hôtel ?", "How far can you decide alone, or with your partner, without the hotel owner's approval?",
            "Jusqu'où pouvez-vous décider seul, ou avec votre associé, sans la validation de vos investisseurs ?", "How far can you decide alone, or with your partner, without your investors' approval?"),
          options: [
            o("contrat", "Jusqu'à la préparation du contrat de vente", "Up to the preparation of the sale contract"),
            { id: "docs", label: who("Jusqu'à l'échange des documents sensibles, puis j'ai besoin de la validation du propriétaire", "Up to the exchange of sensitive documents, then I need the owner's approval",
                "Jusqu'à l'échange des documents sensibles, puis j'ai besoin de la validation de vos investisseurs", "Up to the exchange of sensitive documents, then I need your investors' approval") },
            { id: "nda", label: who("Jusqu'à la signature d'un accord de confidentialité (NDA), puis j'ai besoin de la validation du propriétaire", "Up to signing a confidentiality agreement (NDA), then I need the owner's approval",
                "Jusqu'à la signature d'un accord de confidentialité (NDA), puis j'ai besoin de la validation de vos investisseurs", "Up to signing a confidentiality agreement (NDA), then I need your investors' approval") },
            { id: "debut", label: who("J'ai besoin de la validation du propriétaire dès le départ", "I need the owner's approval from the start",
                "J'ai besoin de la validation de vos investisseurs dès le départ", "I need your investors' approval from the start") },
          ] },
        { id: "authority_note", kind: "note", text: l("La signature du contrat de vente demande toujours l'accord du propriétaire ou des investisseurs.", "Signing the sale contract always requires the approval of the owner or the investors.") },
      ],
    },
    {
      id: "commission",
      title: l("Commission", "Commission"),
      intro: l("Pour savoir comment la commission sera répartie.", "To know how the commission will be shared."),
      fields: [
        { id: "paid", kind: "single", required: true, label: l("Pour ce projet, êtes-vous déjà rémunéré par votre côté ?", "For this project, are you already paid by your side?"),
          options: [
            { id: "paye", label: who("Oui, par le propriétaire de l'hôtel", "Yes, by the hotel owner", "Oui, par mes investisseurs (mandat de recherche)", "Yes, by my investors (search mandate)") },
            o("non_paye", "Non, je ne suis pas rémunéré à part", "No, I am not paid separately"),
          ] },
        { id: "share_note", kind: "note", showIf: (a) => a.paid === "non_paye",
          text: who("Dans ce cas, la commission de la vente est partagée ainsi : 20 % pour l'apporteur d'affaires, 40 % pour vous et 40 % pour le représentant des investisseurs.",
            "In that case, the sale commission is shared as follows: 20% for the business introducer, 40% for you and 40% for the investors' representative.",
            "Dans ce cas, la commission de la vente est partagée ainsi : 20 % pour l'apporteur d'affaires, 40 % pour vous et 40 % pour le détenteur de mandats.",
            "In that case, the sale commission is shared as follows: 20% for the business introducer, 40% for you and 40% for the mandate holder.") },
        { id: "share_ok", kind: "single", required: true, showIf: (a) => a.paid === "non_paye",
          label: l("Êtes-vous d'accord pour partager la commission dans ces conditions ?", "Do you agree to share the commission on these terms?"), options: YNR },
      ],
    },
    {
      id: "process",
      title: l("Le process proposé", "The proposed process"),
      intro: l("Chacun donne un peu, l'autre répond au même niveau. Rien ne circule avant l'étape qui le justifie.", "Each side gives a little, the other answers at the same level. Nothing is shared before the step that justifies it."),
      fields: [
        { id: "flow", kind: "flow" },
        { id: "agree_process", kind: "single", required: true, label: l("Êtes-vous d'accord pour travailler dans ces conditions ?", "Do you agree to work on these terms?"), options: YNR },
        { id: "comment", kind: "longtext", label: l("Une remarque ou un point à ajouter ?", "Any comment or point to add?"), help: l("Facultatif", "Optional") },
      ],
    },
    {
      id: "declaration",
      title: l("Votre déclaration", "Your declaration"),
      intro: l("Avant de valider, lisez et cochez chaque point.", "Before submitting, read and tick each point."),
      fields: [],
      checksLabel: l("Je confirme que :", "I confirm that:"),
      checks: [
        { id: "d1", label: l("Les informations et documents que je transmets sont exacts, complets et à jour, à ma connaissance.", "The information and documents I provide are accurate, complete and up to date, to the best of my knowledge.") },
        { id: "d2", label: l("J'ai le droit de les communiquer.", "I have the right to share them.") },
        { id: "d3", label: l("Je suis seul responsable de ce que je transmets, y compris des documents que je dépose.", "I am solely responsible for what I provide, including any documents I upload.") },
        { id: "d4", label: l("L'apporteur d'affaires relaie les informations sans les garantir. Il fait des contrôles raisonnables avec les moyens dont il dispose, sans obligation de vérifier, et n'est pas responsable d'une information erronée transmise par une partie.",
            "The business introducer relays information without guaranteeing it. They carry out reasonable checks with the means available to them, with no obligation to verify, and are not liable for inaccurate information provided by a party.") },
      ],
    },
  ];
}

export const TXT = {
  fr: {
    kicker: "Confidentiel · Mise en relation hôtels",
    titleMandat: "Détenteur de mandats de vente",
    titleInvest: "Représentant d'investisseurs",
    intro: "Quelques questions de cadrage préparées par l'apporteur d'affaires de cette mise en relation. Elles servent à rédiger un accord qui protège chaque partie. Comptez une à deux minutes : presque tout se fait d'un tap.",
    notice: "À ne pas indiquer ici : coordonnées bancaires, noms d'hôtels ou d'investisseurs, chiffres confidentiels. Ils viendront plus tard, par paliers, après signature d'un NDA.",
    progress: (n: number, t: number) => `${n} réponse${n > 1 ? "s" : ""} sur ${t}`,
    progressLabel: "Progression du questionnaire",
    required: "(obligatoire)",
    submit: "Valider mes réponses",
    sending: "Envoi…",
    thanksTitle: "Merci, c'est noté.",
    thanksText: "L'apporteur d'affaires revient vers vous rapidement. Vous pouvez fermer cette page.",
    copy: "Copier le récapitulatif",
    copied: "Récapitulatif copié.",
    errRequired: "Cette réponse est obligatoire.",
    errEmail: "Cette adresse email n'est pas valide. Vérifiez-la, par exemple prenom@societe.com.",
    errPhone: "Ce numéro n'est pas valide. Indiquez-le avec l'indicatif, par exemple +230 5 123 4567.",
    errDecl: "Cochez chaque point pour continuer.",
    missing: "Certaines réponses obligatoires manquent. Elles sont signalées ci-dessous.",
    fail: "L'envoi a échoué. Vérifiez votre connexion et réessayez. Vous pouvez aussi copier le récapitulatif ci-dessous.",
    tooFast: "Relisez vos réponses un instant, puis envoyez à nouveau.",
    limit: "Trop d'envois depuis votre connexion. Réessayez plus tard.",
    techCode: "Code technique :",
    langLabel: "Langue",
    flowLabel: "Le process en 9 étapes",
    parallel: "en parallèle",
    parallelWith: (n: number) => `en parallèle avec l'étape ${n}`,
    step: "Étape",
    recapTitle: "Récapitulatif",
    validatedOn: "Validé le",
    language: "Langue",
    declarations: "Déclarations cochées",
    form: "Questionnaire",
  },
  en: {
    kicker: "Confidential · Hotel introductions",
    titleMandat: "Holder of hotel sale mandates",
    titleInvest: "Investors' representative",
    intro: "A few scoping questions prepared by the business introducer for this introduction. They are used to draft an agreement that protects each party. It takes one to two minutes: almost everything is a tap.",
    notice: "Please do not include here: bank details, hotel or investor names, confidential figures. These will come later, in stages, after an NDA is signed.",
    progress: (n: number, t: number) => `${n} of ${t} answered`,
    progressLabel: "Questionnaire progress",
    required: "(required)",
    submit: "Submit my answers",
    sending: "Sending…",
    thanksTitle: "Thank you, noted.",
    thanksText: "The business introducer will get back to you shortly. You may close this page.",
    copy: "Copy summary",
    copied: "Summary copied.",
    errRequired: "This answer is required.",
    errEmail: "This email address is not valid. Please check it, for example name@company.com.",
    errPhone: "This number is not valid. Please include the country code, for example +230 5 123 4567.",
    errDecl: "Please tick every point to continue.",
    missing: "Some required answers are missing. They are marked below.",
    fail: "Sending failed. Please check your connection and try again. You can also copy the summary below.",
    tooFast: "Please review your answers for a moment, then send again.",
    limit: "Too many submissions from your connection. Please try again later.",
    techCode: "Technical code:",
    langLabel: "Language",
    flowLabel: "The process in 9 steps",
    parallel: "in parallel",
    parallelWith: (n: number) => `in parallel with step ${n}`,
    step: "Step",
    recapTitle: "Summary",
    validatedOn: "Submitted on",
    language: "Language",
    declarations: "Declarations ticked",
    form: "Questionnaire",
  },
} as const;

// ---------------------------------------------------------------------------
// Parcours des champs, visibilité, progression
// ---------------------------------------------------------------------------

type Entry = Field & { kind: "single" | "text" | "longtext" | "email" | "tel" };
const isInput = (f: Field): f is Entry => f.kind !== "note" && f.kind !== "flow";

export const allFields = (role: FormRole) => sectionsFor(role).flatMap((s) => s.fields);
export const inputFields = (role: FormRole): Entry[] => allFields(role).filter(isInput);
export const isShown = (f: Field, a: Answers) => !f.showIf || f.showIf(a);

export function progress(role: FormRole, a: Answers, decl: Decl) {
  const sections = sectionsFor(role);
  const req = sections.flatMap((s) => s.fields).filter(isInput).filter((f) => f.required && isShown(f, a));
  const done = req.filter((f) => (a[f.id] ?? "").trim() !== "").length;
  const checks = sections.flatMap((s) => s.checks ?? []);
  return { done: done + checks.filter((c) => decl[c.id]).length, total: req.length + checks.length };
}

export const optionLabel = (role: FormRole, fieldId: string, optionId: string, lang: Lang): string | undefined => {
  const f = allFields(role).find((x) => x.id === fieldId);
  return f && f.kind === "single" ? f.options.find((x) => x.id === optionId)?.label[lang] : undefined;
};

const MAX_TEXT = 500;
const MAX_LONG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valide ce qui arrive du navigateur : ne garde que les champs et identifiants connus.
export function validateForm(role: FormRole, lang: Lang, rawAnswers: unknown, rawDecl: unknown) {
  const t = TXT[lang];
  const input = (rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {}) as Record<string, unknown>;
  const declIn = (rawDecl && typeof rawDecl === "object" ? rawDecl : {}) as Record<string, unknown>;
  const fields = allFields(role).filter(isInput);
  const answers: Answers = {};
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const v = input[f.id];
    if (typeof v !== "string") continue;
    if (f.kind === "single") {
      if (f.options.some((x) => x.id === v)) answers[f.id] = v;
    } else {
      const s = v.trim().slice(0, f.kind === "longtext" ? MAX_LONG : MAX_TEXT);
      if (s) answers[f.id] = s;
    }
  }
  for (const f of fields) {
    if (!isShown(f, answers)) { delete answers[f.id]; continue; }
    const v = answers[f.id];
    if (f.required && !v) { errors[f.id] = t.errRequired; continue; }
    if (v && f.kind === "email" && !EMAIL_RE.test(v)) errors[f.id] = t.errEmail;
    if (v && f.kind === "tel" && !(/^[0-9+()\s.\-]+$/.test(v) && v.replace(/\D/g, "").length >= 6)) errors[f.id] = t.errPhone;
  }
  const checks = sectionsFor(role).flatMap((s) => s.checks ?? []);
  const decl: Decl = {};
  for (const c of checks) decl[c.id] = declIn[c.id] === true;
  if (!checks.every((c) => decl[c.id])) errors.declarations = t.errDecl;
  return { answers, decl, errors };
}

export type Stored = {
  v: 2;
  role: FormRole;
  lang: Lang;
  validated_at: string;
  fields: Record<string, { id: string; label: string } | { value: string }>;
  declarations: { id: string; label: string; checked: true }[];
};

// Ce qui est enregistré : l'identifiant ET le libellé dans la langue choisie, plus la langue.
export function toStored(role: FormRole, lang: Lang, answers: Answers, validatedAt: string): Stored {
  const fields: Stored["fields"] = {};
  for (const f of allFields(role).filter(isInput)) {
    const v = answers[f.id];
    if (!v) continue;
    fields[f.id] = f.kind === "single" ? { id: v, label: f.options.find((x) => x.id === v)!.label[lang] } : { value: v };
  }
  const declarations = sectionsFor(role).flatMap((s) => s.checks ?? []).map((c) => ({ id: c.id, label: c.label[lang], checked: true as const }));
  return { v: 2, role, lang, validated_at: validatedAt, fields, declarations };
}

const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long", timeStyle: "short" });

// Une ligne par réponse, dans la langue demandée (les choix sont retraduits depuis leur identifiant).
export function recapRows(s: Stored, lang: Lang) {
  const rows: { section: string; label: string; value: string }[] = [];
  for (const sec of sectionsFor(s.role)) {
    for (const f of sec.fields.filter(isInput)) {
      const a = s.fields[f.id];
      if (!a) continue;
      rows.push({ section: sec.title[lang], label: f.label[lang], value: "id" in a ? optionLabel(s.role, f.id, a.id, lang) ?? a.label : a.value });
    }
  }
  return rows;
}

export function recapText(s: Stored, lang: Lang): string {
  const t = TXT[lang];
  const lines = [
    `KEYROOM — ${t.form} — ${s.role === "mandat" ? t.titleMandat : t.titleInvest}`,
    `${t.validatedOn} : ${fmtDate(s.validated_at, lang)}`,
    `${t.language} : ${lang.toUpperCase()}`,
  ];
  let last = "";
  for (const r of recapRows(s, lang)) {
    if (r.section !== last) { lines.push("", r.section.toUpperCase()); last = r.section; }
    lines.push(`${r.label} : ${r.value}`);
  }
  lines.push("", `${t.declarations} :`);
  for (const c of sectionsFor(s.role).flatMap((x) => x.checks ?? [])) lines.push(`[x] ${c.label[lang]}`);
  return lines.join("\n");
}
