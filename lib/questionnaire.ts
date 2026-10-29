// Questionnaires de cadrage (spécification §9). Les mêmes définitions servent au formulaire,
// à la validation côté serveur, au récapitulatif et à la génération de l'accord.

export type Role = "partie_mandat" | "partie_investisseurs";
export type Answers = Record<string, string | string[]>;

type Base = { id: string; label: string; required?: boolean; showIf?: { id: string; equals: string }; hint?: string };
export type Question =
  | (Base & { type: "text" })
  | (Base & { type: "longtext" })
  | (Base & { type: "single" | "multi"; options: string[] });
export type Block = { id: string; title: string; intro?: string; questions: Question[] };

const ZONES = ["Europe", "Afrique", "Océan Indien", "Moyen-Orient", "Asie", "Amériques"];
const CATEGORIES = ["3 étoiles", "4 étoiles", "5 étoiles", "Boutique-hôtel", "Resort"];
const METHODE = ["Oui", "Oui, avec une remarque", "Non"];

const commun: Block = {
  id: "identite",
  title: "Qui signe",
  intro: "Ces informations servent à identifier les parties dans l'accord.",
  questions: [
    { id: "nom_prenom", type: "text", label: "Nom et prénom", required: true },
    { id: "signe_en_tant_que", type: "single", label: "Vous signez en tant que", required: true, options: ["Société", "Nom propre"] },
    { id: "raison_sociale", type: "text", label: "Raison sociale et forme juridique", required: true, showIf: { id: "signe_en_tant_que", equals: "Société" } },
    { id: "pays", type: "text", label: "Pays d'immatriculation ou de résidence", required: true },
    { id: "immatriculation", type: "text", label: "Numéro d'immatriculation", showIf: { id: "signe_en_tant_que", equals: "Société" } },
    { id: "fonction", type: "text", label: "Fonction" },
    { id: "pouvoir", type: "single", label: "Pouvoir de signature", required: true, options: ["Je signe seul", "Avec une co-signature", "Je dois demander l'accord d'un tiers"] },
    { id: "email", type: "text", label: "Email", required: true },
    { id: "telephone", type: "text", label: "Téléphone avec indicatif", required: true, hint: "Par exemple +230 5 123 4567" },
  ],
};

const mandat: Block[] = [
  {
    id: "hotels",
    title: "Vos hôtels, en gros",
    intro: "Ne donnez ni nom d'hôtel ni chiffre confidentiel à ce stade.",
    questions: [
      { id: "zones", type: "multi", label: "Zones couvertes", options: ZONES },
      { id: "categories", type: "multi", label: "Catégories d'hôtels", options: CATEGORIES },
      { id: "prix", type: "multi", label: "Fourchettes de prix", options: ["Moins de 10 M€", "10 à 30 M€", "30 à 60 M€", "60 à 100 M€", "Plus de 100 M€"] },
    ],
  },
  {
    id: "mandats",
    title: "Mandats et commission",
    questions: [
      { id: "mandats_signes", type: "single", label: "Mandats signés par les propriétaires", required: true, options: ["Tous par écrit", "Certains par écrit", "Surtout oraux"] },
      { id: "commission_prevue", type: "single", label: "Commission prévue dans le mandat", required: true, options: ["Oui, par écrit", "Oui, oralement", "Pas encore définie"] },
      { id: "commission_fourchette", type: "single", label: "Fourchette de commission totale", options: ["Moins de 1 %", "1 à 2 %", "2 à 3 %", "3 à 5 %", "Plus de 5 %", "Je préfère le dire de vive voix"] },
      { id: "commission_partageable", type: "single", label: "Commission partageable avec des co-intermédiaires", required: true, options: ["Oui", "Non", "Selon le propriétaire"] },
      { id: "qui_paie", type: "single", label: "Qui paie la commission", options: ["Le vendeur seul", "Vendeur et acheteur", "Variable selon l'hôtel"] },
      { id: "presenter_tiers", type: "single", label: "Vous pouvez présenter vos hôtels à un tiers et à ses investisseurs", required: true, options: ["Oui, pour tous", "Oui, après accord du propriétaire", "Non"] },
    ],
  },
  {
    id: "blocages",
    title: "Là où ça bloque d'habitude",
    questions: [
      { id: "nom_hotel", type: "single", label: "Vous révélez le nom de l'hôtel", required: true, options: ["Après NDA", "Après NDA et preuve de fonds", "Après LOI signée"] },
      { id: "loi_par_hotel", type: "single", label: "Une LOI par hôtel", required: true, options: ["Oui, obligatoire", "Une LOI cadre est possible", "Selon le propriétaire"] },
    ],
  },
];

const investisseurs: Block[] = [
  {
    id: "investisseurs",
    title: "Vos investisseurs, en gros",
    intro: "Ne donnez aucun nom d'investisseur ni chiffre confidentiel à ce stade.",
    questions: [
      { id: "nature", type: "multi", label: "Nature", options: ["Fonds d'investissement", "Family office", "Particuliers fortunés", "Groupe hôtelier", "Holding ou SCI"] },
      { id: "budgets", type: "multi", label: "Fourchettes de budget", options: ["5 à 10 M€", "10 à 30 M€", "30 à 60 M€", "60 à 100 M€"] },
      { id: "zones", type: "multi", label: "Zones recherchées", options: ZONES },
      { id: "categories", type: "multi", label: "Catégories d'hôtels recherchées", options: CATEGORIES },
      { id: "type_actif", type: "multi", label: "Type d'actif", options: ["Murs", "Fonds de commerce", "Société"] },
    ],
  },
  {
    id: "mandat_commission",
    title: "Mandat et commission",
    questions: [
      { id: "mandat_recherche", type: "single", label: "Mandat de recherche écrit de leur part", required: true, options: ["Oui, pour tous", "Pour certains", "Non"] },
      { id: "remuneration", type: "single", label: "Rémunération", required: true, options: ["Part de la commission du vendeur uniquement", "Honoraires payés par l'investisseur en plus", "Pas encore défini"] },
      { id: "partage_commission", type: "single", label: "Vous acceptez de partager votre commission avec un apporteur", required: true, options: ["Oui", "Non", "À discuter"] },
      { id: "presenter_criteres", type: "single", label: "Vous pouvez présenter leurs critères à un tiers, sous NDA", required: true, options: ["Oui, pour tous", "Oui, après accord de chacun", "Non"] },
    ],
  },
  {
    id: "blocages",
    title: "Là où ça bloque d'habitude",
    questions: [
      { id: "preuve_fonds", type: "single", label: "Vous fournissez la preuve de fonds", required: true, options: ["Avant NDA", "Après NDA", "Après sélection d'un hôtel", "Avec la LOI"] },
      { id: "preuve_precision", type: "single", label: "Précision de cette preuve", options: ["Montant exact", "Fourchette", "Capacité supérieure à un seuil"] },
      { id: "nom_investisseur", type: "single", label: "Vous révélez le nom de l'investisseur", required: true, options: ["Après NDA", "Après sélection d'un hôtel", "Au moment de la LOI"] },
      { id: "loi_par_hotel", type: "single", label: "LOI par hôtel", options: ["Une LOI par hôtel", "Une LOI cadre est possible", "Selon l'investisseur"] },
    ],
  },
];

const methode: Block = {
  id: "methode",
  title: "Accord sur la méthode",
  questions: [
    { id: "m_etapes", type: "single", label: "D'accord avec les étapes proposées", required: true, options: METHODE },
    { id: "m_commission", type: "single", label: "La commission n'est due qu'à la réalisation de la vente, payée à la clôture via un notaire ou un avocat", required: true, options: METHODE },
    { id: "m_protection", type: "single", label: "La commission reste due si la vente se fait avec un acheteur introduit par Ahmed, même sans lui, pendant 12 à 24 mois", required: true, options: METHODE },
    { id: "m_noncontournement", type: "single", label: "Une clause de non-contournement lie les trois parties", required: true, options: METHODE },
    { id: "remarque", type: "longtext", label: "Remarque ou condition", hint: "Facultatif" },
  ],
};

export const isRole = (v: unknown): v is Role => v === "partie_mandat" || v === "partie_investisseurs";

export function blocksFor(role: Role): Block[] {
  return [commun, ...(role === "partie_mandat" ? mandat : investisseurs), methode];
}

export function isVisible(q: Question, answers: Answers): boolean {
  return !q.showIf || answers[q.showIf.id] === q.showIf.equals;
}

export function visibleQuestions(role: Role, answers: Answers): Question[] {
  return blocksFor(role).flatMap((b) => b.questions).filter((q) => isVisible(q, answers));
}

const MAX_TEXT = 500;
const MAX_LONG = 2000;

// Nettoie les réponses reçues (ne garde que les questions et options connues) et les valide.
export function sanitizeAnswers(role: Role, raw: unknown): { answers: Answers; errors: Record<string, string> } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: Answers = {};
  const errors: Record<string, string> = {};

  // Deux passes : les réponses « pilotes » d'abord, pour évaluer les conditions.
  for (const q of blocksFor(role).flatMap((b) => b.questions)) {
    const v = input[q.id];
    if (q.type === "single") {
      if (typeof v === "string" && q.options.includes(v)) answers[q.id] = v;
    } else if (q.type === "multi") {
      if (Array.isArray(v)) {
        const kept = q.options.filter((o) => v.includes(o));
        if (kept.length) answers[q.id] = kept;
      }
    } else if (typeof v === "string") {
      const t = v.trim().slice(0, q.type === "longtext" ? MAX_LONG : MAX_TEXT);
      if (t) answers[q.id] = t;
    }
  }

  for (const q of blocksFor(role).flatMap((b) => b.questions)) {
    if (!isVisible(q, answers)) {
      delete answers[q.id];
      continue;
    }
    if (q.required && !answers[q.id]) errors[q.id] = "Cette réponse est obligatoire.";
  }
  const email = answers.email;
  if (typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Cette adresse email n'est pas valide. Vérifiez-la, par exemple prenom@societe.com.";
  }
  return { answers, errors };
}

export function progress(role: Role, answers: Answers) {
  const required = visibleQuestions(role, answers).filter((q) => q.required);
  const done = required.filter((q) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
  }).length;
  return { done, total: required.length };
}

export const display = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");
