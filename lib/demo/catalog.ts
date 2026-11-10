import type { DocReq, ProfileKind, Question, RoleKind, Side, Step } from "./types";

export const BRAND = "Keyroom";

export const PROFILES: { kind: ProfileKind; label: string; role: RoleKind; blurb: string }[] = [
  { kind: "agent", label: "Agent immobilier", role: "agent", blurb: "Vous accompagnez des vendeurs ou des acquéreurs et vous voulez des transactions plus sûres." },
  { kind: "apporteur", label: "Apporteur d'affaires", role: "introducer", blurb: "Vous mettez en relation des parties et vous arbitrez le processus." },
  { kind: "proprietaire", label: "Propriétaire vendeur", role: "sale", blurb: "Vous vendez votre bien et vous voulez le faire de façon sécurisée." },
  { kind: "acquereur", label: "Acquéreur ou investisseur", role: "search", blurb: "Vous cherchez un bien à acquérir." },
  { kind: "mandat_vente", label: "Détenteur de mandats de vente", role: "sale", blurb: "Vous détenez des mandats pour vendre des biens." },
  { kind: "mandat_recherche", label: "Détenteur de mandats de recherche", role: "search", blurb: "Vous cherchez des biens pour le compte d'acquéreurs." },
  { kind: "notaire", label: "Notaire", role: "legal", blurb: "Vous intervenez sur l'acte et sur la sécurité juridique." },
  { kind: "avocat", label: "Avocat", role: "legal", blurb: "Vous conseillez l'une des parties." },
  { kind: "autre", label: "Autre", role: "other", blurb: "Votre situation est différente : vous choisirez votre rôle projet par projet." },
];

export const ROLES: Record<RoleKind, { label: string; side?: Side }> = {
  sale: { label: "Vente (vendeur ou mandat de vente)", side: "sale" },
  search: { label: "Recherche (acquéreur ou mandat de recherche)", side: "search" },
  introducer: { label: "Apporteur d'affaires" },
  agent: { label: "Agent immobilier" },
  legal: { label: "Notaire ou avocat" },
  other: { label: "Autre" },
};
export const roleShort = (r: RoleKind) => ({ sale: "Vente", search: "Recherche", introducer: "Apporteur", agent: "Agent", legal: "Conseil", other: "Autre" }[r]);
export const profileFor = (k: ProfileKind | null) => PROFILES.find((p) => p.kind === k);

export const REQ_LABEL = { agreement: "signature de toutes les parties", forms: "questionnaires remplis", docs: "documents déposés", approval: "accord des parties" } as const;

type StepDef = Omit<Step, "enabled" | "status">;
const s = (id: string, title: string, sub: string, group: number, requires: StepDef["requires"], reveals: StepDef["reveals"] = [], side?: Side): StepDef => ({ id, title, sub, group, requires, reveals, side });

export type Template = { id: string; name: string; tag: string; blurb: string; simpleOff: string[]; steps: StepDef[]; docs: Omit<DocReq, "enabled">[]; questions: Omit<Question, "enabled">[]; mandate: boolean };

const PRICE = ["Moins de 500 000 €", "500 000 € à 2 M€", "2 à 10 M€", "Plus de 10 M€"];
const d = (id: string, side: DocReq["side"], label: string, required: boolean, adminAccess: boolean, soon?: string): Omit<DocReq, "enabled"> => ({ id, side, label, required, adminAccess, soon });
const q = (id: string, side: Side, label: string, type: "text" | "single", required: boolean, options?: string[], mandate?: boolean): Omit<Question, "enabled"> => ({ id, side, label, type, required, options, mandate });

export const TEMPLATES: Template[] = [
  {
    id: "grosse",
    name: "Vente d'un actif, grosse transaction",
    tag: "Sécurité renforcée",
    blurb: "Hôtel, immeuble, actif de grande valeur. Accord tripartite, NDA, preuve de fonds, documents révélés par paliers.",
    mandate: true,
    simpleOff: ["g4", "g5a", "g6", "g7"],
    steps: [
      s("g1", "Accord tripartite", "Signé par toutes les parties ; accord sur le déroulé du processus", 1, ["agreement"]),
      s("g2a", "Teaser anonyme", "Bien : pays, taille, prix", 2, ["forms"], [], "sale"),
      s("g2b", "Critères anonymes", "Budget, zone, type de bien", 2, ["forms"], [], "search"),
      s("g3", "Sélection par l'administrateur", "2 à 3 biens maximum", 3, []),
      s("g4", "NDA signé par les parties", "Rien n'est communiqué avant cette étape", 4, ["agreement"], ["identities"]),
      s("g5a", "Nom du bien et chiffres clés", "Communiqués par la partie vente", 5, ["approval"], [], "sale"),
      s("g5b", "Preuve de fonds et LOI", "Uniquement sur la sélection", 5, ["docs"], [], "search"),
      s("g6", "MOU et exclusivité", "Prix, délais, conditions", 6, ["agreement"]),
      s("g7", "Data room par paliers", "Documents sensibles, par étapes", 7, ["approval"], ["documents"]),
      s("g8", "Contrat de vente", "Acte définitif, conditions suspensives", 8, ["agreement"]),
    ],
    docs: [
      d("v1", "sale", "Mandat de vente signé", true, true),
      d("v2", "sale", "Titre de propriété ou acte notarié", true, false),
      d("v3", "sale", "Teaser anonyme du bien", true, true),
      d("v4", "sale", "Pièce d'identité du signataire", true, false, "Vérification automatique de l'identité"),
      d("v5", "sale", "Extrait de registre de la société", false, false, "Vérification automatique de la société"),
      d("v6", "sale", "Diagnostics et états du bien", false, false),
      d("r1", "search", "Mandat de recherche signé", true, true),
      d("r2", "search", "Preuve de fonds", true, false),
      d("r3", "search", "Critères de recherche anonymes", true, true),
      d("r4", "search", "Pièce d'identité du signataire", true, false, "Vérification automatique de l'identité"),
      d("r5", "search", "Extrait de registre de la société", false, false, "Vérification automatique de la société"),
    ],
    questions: [
      q("sq1", "sale", "Type de bien", "text", true, undefined, true),
      q("sq2", "sale", "Localisation (pays, ville)", "text", true, undefined, true),
      q("sq3", "sale", "Surface ou capacité", "text", false),
      q("sq4", "sale", "Prix souhaité", "single", true, PRICE, true),
      q("sq5", "sale", "Mandat écrit du propriétaire", "single", true, ["Oui", "Non", "En cours"]),
      q("rq1", "search", "Type de bien recherché", "text", true),
      q("rq2", "search", "Zones recherchées", "text", true),
      q("rq3", "search", "Budget", "single", true, PRICE),
      q("rq4", "search", "Mode de financement", "single", false, ["Fonds propres", "Prêt", "Mixte"]),
    ],
  },
  {
    id: "standard",
    name: "Vente immobilière, transaction standard",
    tag: "Version simple",
    blurb: "Maison, appartement. Moins d'étapes : accord des parties, documents du bien, accord de financement, compromis, notaire.",
    mandate: true,
    simpleOff: [],
    steps: [
      s("s1", "Accord des parties", "Les parties valident le déroulé", 1, ["agreement"]),
      s("s2a", "Présentation du bien", "Description, localisation, prix", 2, ["forms"], [], "sale"),
      s("s2b", "Projet de l'acquéreur", "Besoin, budget, financement", 2, ["forms"], [], "search"),
      s("s3", "Documents du bien", "Titre, diagnostics, DPE", 3, ["docs"], ["identities"]),
      s("s4", "Accord de financement", "Accord de principe de prêt ou preuve de fonds", 4, ["docs"]),
      s("s5", "Compromis ou promesse de vente", "Signature par les parties", 5, ["agreement"], ["documents"]),
      s("s6", "Passage chez le notaire", "Acte authentique", 6, []),
    ],
    docs: [
      d("v1", "sale", "Titre de propriété", true, false),
      d("v2", "sale", "Diagnostic de performance énergétique (DPE)", true, false),
      d("v3", "sale", "Diagnostics obligatoires", true, false),
      d("v4", "sale", "Taxe foncière", false, false),
      d("v5", "sale", "Pièce d'identité du propriétaire", true, false, "Vérification automatique de l'identité"),
      d("r1", "search", "Accord de principe de prêt ou preuve de fonds", true, false),
      d("r2", "search", "Pièce d'identité", true, false, "Vérification automatique de l'identité"),
    ],
    questions: [
      q("sq1", "sale", "Type de bien", "text", true, undefined, true),
      q("sq2", "sale", "Adresse du bien", "text", true, undefined, true),
      q("sq3", "sale", "Prix souhaité", "single", true, PRICE, true),
      q("rq1", "search", "Type de bien recherché", "text", true),
      q("rq2", "search", "Secteur recherché", "text", true),
      q("rq3", "search", "Budget", "single", true, PRICE),
    ],
  },
  {
    id: "libre",
    name: "Projet libre",
    tag: "À construire",
    blurb: "Vous partez d'un processus vide et vous ajoutez vos propres étapes, questions et documents.",
    mandate: false,
    simpleOff: [],
    steps: [s("l1", "Démarrage", "Première étape à renommer", 1, [])],
    docs: [],
    questions: [],
  },
];
export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const SOON = [
  { id: "id", title: "Vérification d'identité", text: "Contrôle automatique de la pièce d'identité et de sa correspondance avec la personne." },
  { id: "company", title: "Vérification des entreprises", text: "Contrôle de l'existence et de la situation d'une société à partir des registres officiels." },
  { id: "esign", title: "Signature électronique certifiée", text: "Signature à valeur légale, avec horodatage, intégrée au parcours. Aujourd'hui : signature simulée." },
  { id: "contract", title: "Contrats rédigés et validés par un avocat", text: "Modèles de mandats et de contrats relus par un avocat, générés à partir des réponses." },
  { id: "ai", title: "Assistant IA", text: "Aide à la rédaction des teasers, des annonces et des messages entre les parties." },
  { id: "vault", title: "Coffre de documents réutilisable", text: "Vos documents restent dans votre espace et se joignent à un nouveau projet en un clic." },
  { id: "notif", title: "Notifications", text: "Alertes par email lorsqu'une partie dépose un document ou valide une étape." },
];
