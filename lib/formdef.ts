// Questionnaires publics (lien partagé) : définition unique, bilingue, avec identifiants stables.
// La logique conditionnelle et les réponses enregistrées utilisent les identifiants, jamais les libellés.
export type Lang = "fr" | "en";
export type L = Record<Lang, string>;
export type FormRole = "mandat" | "investisseurs";
export type Answers = Record<string, string | string[]>;
export type Decl = Record<string, boolean>;

export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";
export const isFormRole = (v: unknown): v is FormRole => v === "mandat" || v === "investisseurs";

type Opt = { id: string; label: L };
type Base = { id: string; showIf?: (a: Answers) => boolean };
export type Field =
  | (Base & { kind: "single"; label: L; options: Opt[]; required?: boolean })
  | (Base & { kind: "multi"; label: L; options: Opt[]; required?: boolean })
  | (Base & { kind: "text" | "longtext" | "email" | "tel"; label: L; help?: L; required?: boolean; ac?: string })
  | (Base & { kind: "note"; text: L })
  | (Base & { kind: "flow" });
export type Section = { id: string; title: L; intro: L; fields: Field[]; checks?: { id: string; label: L }[]; checksLabel?: L };

const l = (fr: string, en: string): L => ({ fr, en });
const o = (id: string, fr: string, en: string): Opt => ({ id, label: l(fr, en) });
const isSoc = (a: Answers) => a.acting === "soc";
const isPart = (a: Answers) => a.acting === "part";
const YNR = [o("oui", "Oui", "Yes"), o("oui_remarque", "Oui, avec une réserve", "Yes, with a reservation"), o("non", "Non", "No")];

export const STEPS: { n: number; label: L }[] = [
  { n: 1, label: l("Accord de commission et de non-contournement, signé par les trois parties", "Commission and non-circumvention agreement, signed by all three parties") },
  { n: 2, label: l("Teaser anonyme de l'hôtel et critères de recherche anonymes de l'investisseur", "Anonymous hotel teaser and anonymous investor search criteria") },
  { n: 3, label: l("Sélection de deux à trois hôtels par l'apporteur d'affaires", "Shortlist of two to three hotels by the business introducer") },
  { n: 4, label: l("NDA signé par les deux parties", "NDA signed by both parties") },
  { n: 5, label: l("Communication du nom de l'hôtel et des chiffres clés", "Disclosure of the hotel's name and key figures") },
  { n: 6, label: l("Preuve de fonds et LOI, uniquement pour les hôtels sélectionnés", "Proof of funds and LOI, for shortlisted hotels only") },
  { n: 7, label: l("MOU assorti d'une clause d'exclusivité", "MOU with an exclusivity clause") },
  { n: 8, label: l("Documents sensibles, communiqués par paliers", "Sensitive documents, released in stages") },
  { n: 9, label: l("Contrat de vente", "Sale contract") },
];

export function sectionsFor(role: FormRole): Section[] {
  const mandat = role === "mandat";
  // « le propriétaire » côté mandats, « vos investisseurs » côté investisseurs.
  const who = (fr: string, en: string, frInv: string, enInv: string) => (mandat ? l(fr, en) : l(frInv, enInv));

  return [
    {
      id: "who",
      title: l("Identification", "Identification"),
      intro: l("Ces informations permettent de vous identifier avec exactitude dans l'accord.", "These details allow you to be identified accurately in the agreement."),
      fields: [
        { id: "acting", kind: "single", required: true, label: l("Vous intervenez", "You are acting"),
          options: [o("soc", "En qualité de société", "As a company"), o("part", "En qualité de particulier", "As an individual")] },
        { id: "company_name", kind: "text", required: true, ac: "organization", showIf: isSoc, label: l("Dénomination sociale", "Company name") },
        { id: "company_type", kind: "text", required: true, showIf: isSoc, label: l("Forme juridique", "Legal form"), help: l("Par exemple : SARL, SA, Ltd, LLC", "For example: Ltd, LLC, SA") },
        { id: "company_country", kind: "text", required: true, ac: "country-name", showIf: isSoc, label: l("Pays d'immatriculation de la société", "Country of registration of the company") },
        { id: "company_reg", kind: "text", showIf: isSoc, label: l("Numéro d'immatriculation de la société", "Company registration number"), help: l("Si vous en disposez", "If available") },
        { id: "company_address", kind: "text", required: true, ac: "street-address", showIf: isSoc, label: l("Adresse du siège social", "Registered office address"), help: l("Rue, code postal, ville, pays", "Street, postcode, city, country") },
        { id: "signer_name", kind: "text", required: true, ac: "name", showIf: isSoc, label: l("Nom et prénom du signataire", "Full name of the signatory") },
        { id: "signer_role", kind: "text", required: true, ac: "organization-title", showIf: isSoc, label: l("Fonction du signataire au sein de la société", "Position of the signatory within the company"), help: l("Par exemple : gérant, directeur", "For example: director, manager") },
        { id: "first_name", kind: "text", required: true, ac: "given-name", showIf: isPart, label: l("Prénom", "First name") },
        { id: "last_name", kind: "text", required: true, ac: "family-name", showIf: isPart, label: l("Nom", "Last name") },
        { id: "home_address", kind: "text", required: true, ac: "street-address", showIf: isPart, label: l("Adresse de résidence", "Residential address"), help: l("Rue, code postal, ville, pays", "Street, postcode, city, country") },
        { id: "email", kind: "email", required: true, ac: "email", label: l("Adresse email", "Email address") },
        { id: "phone", kind: "tel", required: true, ac: "tel", label: l("Numéro de téléphone", "Phone number"), help: l("Avec l'indicatif du pays, par exemple +230 5…", "Including the country code, for example +230 5…") },
        { id: "contact_pref", kind: "multi", label: l("Vos moyens de contact privilégiés", "Your preferred means of contact"),
          options: [o("email", "Email", "Email"), o("phone", "Téléphone", "Phone"), o("whatsapp", "WhatsApp", "WhatsApp")] },
      ],
    },
    {
      id: "activity",
      title: l("Votre activité", "Your activity"),
      intro: l("Deux points de cadrage.", "Two scoping points."),
      fields: [
        ...(mandat
          ? ([
              { id: "mandates_signed", kind: "single", required: true, label: l("Les mandats qui vous ont été confiés par les propriétaires sont", "The mandates entrusted to you by the owners are"),
                options: [o("all_written", "Tous formalisés par écrit", "All in writing"), o("some_written", "Certains formalisés par écrit", "Some in writing"), o("mostly_verbal", "Principalement verbaux", "Mostly verbal")] },
              { id: "can_present", kind: "single", required: true, label: l("Vous êtes autorisé à présenter vos hôtels à un tiers et à ses investisseurs", "You are authorised to present your hotels to a third party and its investors"),
                options: [o("yes_all", "Oui, pour l'ensemble des hôtels", "Yes, for all hotels"), o("yes_owner", "Oui, sous réserve de l'accord du propriétaire", "Yes, subject to the owner's approval"), o("no", "Non", "No")] },
            ] as Field[])
          : ([
              { id: "search_mandate", kind: "single", required: true, label: l("Vous disposez d'un mandat de recherche écrit de la part de vos investisseurs", "You hold a written search mandate from your investors"),
                options: [o("yes_all", "Oui, pour l'ensemble de mes investisseurs", "Yes, for all of my investors"), o("some", "Pour certains d'entre eux", "For some of them"), o("no", "Non", "No")] },
              { id: "can_present", kind: "single", required: true, label: l("Vous êtes autorisé à présenter leurs critères à un tiers, sous NDA", "You are authorised to present their criteria to a third party, under NDA"),
                options: [o("yes_all", "Oui, pour l'ensemble de mes investisseurs", "Yes, for all of my investors"), o("yes_each", "Oui, sous réserve de l'accord de chacun", "Yes, subject to each one's approval"), o("no", "Non", "No")] },
            ] as Field[])),
        { id: "authority", kind: "single", required: true,
          label: who("Jusqu'à quel stade pouvez-vous décider seul, ou avec votre associé, sans l'accord du propriétaire de l'hôtel ?", "Up to what stage can you decide alone, or together with your partner, without the hotel owner's approval?",
            "Jusqu'à quel stade pouvez-vous décider seul, ou avec votre associé, sans l'accord de vos investisseurs ?", "Up to what stage can you decide alone, or together with your partner, without your investors' approval?"),
          options: [
            o("contrat", "Jusqu'à la préparation du contrat de vente", "Up to the preparation of the sale contract"),
            { id: "docs", label: who("Jusqu'à l'échange des documents sensibles, puis l'accord du propriétaire est requis", "Up to the exchange of sensitive documents, after which the owner's approval is required",
                "Jusqu'à l'échange des documents sensibles, puis l'accord de vos investisseurs est requis", "Up to the exchange of sensitive documents, after which your investors' approval is required") },
            { id: "nda", label: who("Jusqu'à la signature d'un accord de confidentialité (NDA), puis l'accord du propriétaire est requis", "Up to the signing of a confidentiality agreement (NDA), after which the owner's approval is required",
                "Jusqu'à la signature d'un accord de confidentialité (NDA), puis l'accord de vos investisseurs est requis", "Up to the signing of a confidentiality agreement (NDA), after which your investors' approval is required") },
            { id: "debut", label: who("L'accord du propriétaire est requis dès le départ", "The owner's approval is required from the outset",
                "L'accord de vos investisseurs est requis dès le départ", "Your investors' approval is required from the outset") },
          ] },
        { id: "authority_note", kind: "note", text: l("La signature du contrat de vente requiert, dans tous les cas, l'accord du propriétaire ou des investisseurs.", "Signing the sale contract requires, in all cases, the approval of the owner or the investors.") },
      ],
    },
    {
      id: "commission",
      title: l("Commission", "Commission"),
      intro: l("Ces informations déterminent les modalités de répartition de la commission.", "These details determine how the commission will be allocated."),
      fields: [
        { id: "paid", kind: "single", required: true, label: l("Pour ce projet, êtes-vous déjà rémunéré par votre mandant ?", "For this project, are you already remunerated by your principal?"),
          options: [
            { id: "paye", label: who("Oui, par le propriétaire de l'hôtel", "Yes, by the hotel owner", "Oui, par mes investisseurs (mandat de recherche)", "Yes, by my investors (search mandate)") },
            o("non_paye", "Non, je ne perçois pas de rémunération distincte", "No, I do not receive separate remuneration"),
          ] },
        { id: "share_note", kind: "note", showIf: (a) => a.paid === "non_paye",
          text: who("Dans ce cas, la commission de vente est répartie comme suit : 20 % pour l'apporteur d'affaires, 40 % pour vous-même et 40 % pour le représentant des investisseurs.",
            "In that case, the sale commission is allocated as follows: 20% to the business introducer, 40% to you and 40% to the investors' representative.",
            "Dans ce cas, la commission de vente est répartie comme suit : 20 % pour l'apporteur d'affaires, 40 % pour vous-même et 40 % pour le détenteur de mandats.",
            "In that case, the sale commission is allocated as follows: 20% to the business introducer, 40% to you and 40% to the mandate holder.") },
        { id: "share_ok", kind: "single", required: true, showIf: (a) => a.paid === "non_paye",
          label: l("Acceptez-vous de partager la commission selon ces modalités ?", "Do you agree to share the commission on these terms?"), options: YNR },
      ],
    },
    {
      id: "process",
      title: l("Le processus proposé", "The proposed process"),
      intro: l("Chaque partie transmet progressivement des éléments, et l'autre y répond à un niveau équivalent. Aucune information n'est communiquée avant l'étape qui la justifie.", "Each party discloses information progressively, and the other responds at an equivalent level. No information is shared before the step that justifies it."),
      fields: [
        { id: "flow", kind: "flow" },
        { id: "agree_process", kind: "single", required: true, label: l("Acceptez-vous de travailler selon ces modalités ?", "Do you agree to proceed on these terms?"), options: YNR },
        { id: "comment", kind: "longtext", label: l("Souhaitez-vous formuler une remarque ou ajouter un point ?", "Would you like to add a comment or raise a point?"), help: l("Facultatif", "Optional") },
      ],
    },
    {
      id: "declaration",
      title: l("Votre déclaration", "Your declaration"),
      intro: l("Avant de valider, veuillez lire et cocher chacun des points suivants.", "Before submitting, please read and tick each of the following points."),
      fields: [],
      checksLabel: l("Je déclare que :", "I declare that:"),
      checks: [
        { id: "d1", label: l("Les informations et documents que je transmets sont exacts, complets et à jour, à ma connaissance.", "The information and documents I provide are accurate, complete and up to date, to the best of my knowledge.") },
        { id: "d2", label: l("Je suis en droit de les communiquer.", "I am entitled to share them.") },
        { id: "d3", label: l("Je suis seul responsable de ce que je transmets, y compris des documents que je dépose.", "I am solely responsible for what I provide, including any documents I upload.") },
        { id: "d4", label: l("L'apporteur d'affaires relaie les informations sans les garantir. Il procède à des vérifications raisonnables avec les moyens dont il dispose, sans obligation de vérification, et ne saurait être tenu responsable d'une information erronée transmise par l'une des parties.",
            "The business introducer relays information without guaranteeing it. They carry out reasonable checks with the means available to them, without any obligation to verify, and cannot be held liable for inaccurate information provided by a party.") },
      ],
    },
  ];
}

export const TXT = {
  fr: {
    kicker: "Confidentiel · Mise en relation hôtelière",
    titleMandat: "Détenteur de mandats de vente",
    titleInvest: "Représentant d'investisseurs",
    intro: "Ce questionnaire de cadrage a été préparé par l'apporteur d'affaires en charge de cette mise en relation. Il permet de rédiger un accord protégeant chacune des parties. Prévoyez une à deux minutes : l'essentiel des réponses se sélectionne d'un simple geste.",
    notice: "À ne pas renseigner ici : coordonnées bancaires, noms d'hôtels ou d'investisseurs, chiffres confidentiels. Ces éléments seront échangés ultérieurement, par paliers, après la signature d'un accord de confidentialité (NDA).",
    progress: (n: number, t: number) => `${n} réponse${n > 1 ? "s" : ""} sur ${t}`,
    progressLabel: "Progression du questionnaire",
    required: "(obligatoire)",
    multi: "Plusieurs choix possibles.",
    submit: "Valider et transmettre",
    sending: "Transmission en cours…",
    thanksTitle: "Vos réponses ont bien été enregistrées",
    thanksText: "Nous vous remercions. Vous trouverez ci-dessous le récapitulatif de votre saisie.",
    doneTitle: "Votre démarche est terminée",
    doneText: "Vos réponses ont bien été transmises à l'apporteur d'affaires, qui reviendra vers vous dans les meilleurs délais. Vous pouvez dès à présent fermer cette page.",
    copy: "Copier le récapitulatif",
    copied: "Récapitulatif copié.",
    errRequired: "Cette réponse est requise.",
    errEmail: "Cette adresse email n'est pas valide. Veuillez la vérifier, par exemple prenom@societe.com.",
    errPhone: "Ce numéro n'est pas valide. Veuillez le saisir avec l'indicatif du pays, par exemple +230 5 123 4567.",
    errDecl: "Veuillez cocher chacune des déclarations pour poursuivre.",
    missing: "Certaines réponses requises sont manquantes. Elles sont signalées ci-dessous.",
    fail: "La transmission a échoué. Veuillez vérifier votre connexion et réessayer. Vous pouvez également copier le récapitulatif ci-dessous.",
    tooFast: "Veuillez relire vos réponses, puis valider à nouveau.",
    limit: "Le nombre d'envois depuis votre connexion est trop élevé. Veuillez réessayer ultérieurement.",
    techCode: "Code technique :",
    langLabel: "Langue",
    flowLabel: "Le processus en 9 étapes",
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
    intro: "This scoping questionnaire has been prepared by the business introducer responsible for this introduction. It is used to draft an agreement that protects each party. Please allow one to two minutes: most answers can be selected with a single tap.",
    notice: "Please do not provide here: bank details, hotel or investor names, or confidential figures. These will be exchanged at a later stage, in successive steps, once a confidentiality agreement (NDA) has been signed.",
    progress: (n: number, t: number) => `${n} of ${t} answered`,
    progressLabel: "Questionnaire progress",
    required: "(required)",
    multi: "Several choices possible.",
    submit: "Confirm and submit",
    sending: "Submitting…",
    thanksTitle: "Your answers have been recorded",
    thanksText: "Thank you. Please find below a summary of your submission.",
    doneTitle: "Your submission is complete",
    doneText: "Your answers have been passed on to the business introducer, who will get back to you as soon as possible. You may now close this page.",
    copy: "Copy summary",
    copied: "Summary copied.",
    errRequired: "This answer is required.",
    errEmail: "This email address is not valid. Please check it, for example name@company.com.",
    errPhone: "This number is not valid. Please enter it with the country code, for example +230 5 123 4567.",
    errDecl: "Please tick each declaration to continue.",
    missing: "Some required answers are missing. They are marked below.",
    fail: "The submission failed. Please check your connection and try again. You may also copy the summary below.",
    tooFast: "Please review your answers, then submit again.",
    limit: "Too many submissions have been made from your connection. Please try again later.",
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

type Entry = Field & { kind: "single" | "multi" | "text" | "longtext" | "email" | "tel" };
const isInput = (f: Field): f is Entry => f.kind !== "note" && f.kind !== "flow";

export const allFields = (role: FormRole) => sectionsFor(role).flatMap((s) => s.fields);
export const inputFields = (role: FormRole): Entry[] => allFields(role).filter(isInput);
export const isShown = (f: Field, a: Answers) => !f.showIf || f.showIf(a);

export function progress(role: FormRole, a: Answers, decl: Decl) {
  const sections = sectionsFor(role);
  const req = sections.flatMap((s) => s.fields).filter(isInput).filter((f) => f.required && isShown(f, a));
  const done = req.filter((f) => { const v = a[f.id]; return Array.isArray(v) ? v.length > 0 : (v ?? "").trim() !== ""; }).length;
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
    if (f.kind === "multi") {
      // Seuls les identifiants connus sont gardés, dans l'ordre des options.
      if (Array.isArray(v)) { const kept = f.options.map((x) => x.id).filter((id) => v.includes(id)); if (kept.length) answers[f.id] = kept; }
      continue;
    }
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
    if (typeof v !== "string") continue;
    if (f.kind === "email" && !EMAIL_RE.test(v)) errors[f.id] = t.errEmail;
    if (f.kind === "tel" && !(/^[0-9+()\s.\-]+$/.test(v) && v.replace(/\D/g, "").length >= 6)) errors[f.id] = t.errPhone;
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
  fields: Record<string, { id: string; label: string } | { ids: string[]; labels: string[] } | { value: string }>;
  declarations: { id: string; label: string; checked: true }[];
};

// Ce qui est enregistré : l'identifiant ET le libellé dans la langue choisie, plus la langue.
export function toStored(role: FormRole, lang: Lang, answers: Answers, validatedAt: string): Stored {
  const fields: Stored["fields"] = {};
  for (const f of allFields(role).filter(isInput)) {
    const v = answers[f.id];
    if (!v || (Array.isArray(v) && !v.length)) continue;
    if (f.kind === "multi" && Array.isArray(v)) fields[f.id] = { ids: v, labels: v.map((id) => f.options.find((x) => x.id === id)!.label[lang]) };
    else if (f.kind === "single" && typeof v === "string") fields[f.id] = { id: v, label: f.options.find((x) => x.id === v)!.label[lang] };
    else if (typeof v === "string") fields[f.id] = { value: v };
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
      const value = "ids" in a ? a.ids.map((id, i) => optionLabel(s.role, f.id, id, lang) ?? a.labels[i]).join(", ")
        : "id" in a ? optionLabel(s.role, f.id, a.id, lang) ?? a.label : a.value;
      rows.push({ section: sec.title[lang], label: f.label[lang], value });
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
