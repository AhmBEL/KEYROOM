import type { L } from "./formdef";

// Informations légales de l'éditeur. À compléter : tant que les champs obligatoires sont vides,
// la page affiche des repères « à compléter » et aucun lien vers elle n'est publié.
export type LegalConfig = {
  editorName: string;          // nom de la personne ou de la société qui édite le site
  legalForm: string;           // forme juridique (facultatif pour un particulier)
  registration: string;        // numéro d'immatriculation (facultatif pour un particulier)
  address: string;             // adresse postale (siège, ou adresse professionnelle)
  email: string;               // adresse de contact
  publicationDirector: string; // directeur de la publication
  databaseRegion: string;      // où est hébergée la base de données, ex. « Union européenne (Francfort) »
  governingLaw: string;        // droit applicable, ex. « le droit de la République de Maurice »
  updated: string;             // date de dernière mise à jour (AAAA-MM-JJ)
};

export const LEGAL: LegalConfig = {
  editorName: "",
  legalForm: "",
  registration: "",
  address: "",
  email: "",
  publicationDirector: "",
  databaseRegion: "",
  governingLaw: "",
  updated: "2026-11-05",
};

export const REQUIRED: (keyof LegalConfig)[] = ["editorName", "address", "email", "publicationDirector", "databaseRegion", "governingLaw"];
export const legalComplete = (c: LegalConfig = LEGAL) => REQUIRED.every((k) => c[k].trim() !== "");

const TODO: L = { fr: "[à compléter]", en: "[to be completed]" };
export const TODO_RE = /(\[(?:à compléter|to be completed)\])/;

export type LegalSection = { id: string; title: L; paragraphs: L[] };

export function legalSections(c: LegalConfig = LEGAL): LegalSection[] {
  const v = (k: keyof LegalConfig): L => (c[k].trim() ? { fr: c[k].trim(), en: c[k].trim() } : TODO);
  const both = (fr: string, en: string): L => ({ fr, en });
  const j = (build: (lang: "fr" | "en") => string): L => ({ fr: build("fr"), en: build("en") });

  const identity = j((lang) => {
    const form = c.legalForm.trim() ? `, ${c.legalForm.trim()}` : "";
    const reg = c.registration.trim() ? (lang === "fr" ? `, immatriculé(e) sous le numéro ${c.registration.trim()}` : `, registered under number ${c.registration.trim()}`) : "";
    return lang === "fr"
      ? `Le site Keyroom est édité par ${v("editorName").fr}${form}${reg}, dont l'adresse est ${v("address").fr}.`
      : `The Keyroom website is published by ${v("editorName").en}${form}${reg}, whose address is ${v("address").en}.`;
  });

  return [
    {
      id: "editeur",
      title: both("Éditeur du site", "Publisher"),
      paragraphs: [
        identity,
        j((lang) => (lang === "fr" ? `Directeur de la publication : ${v("publicationDirector").fr}.` : `Publication director: ${v("publicationDirector").en}.`)),
        j((lang) => (lang === "fr" ? `Contact : ${v("email").fr}.` : `Contact: ${v("email").en}.`)),
      ],
    },
    {
      id: "hebergement",
      title: both("Hébergement", "Hosting"),
      paragraphs: [
        both("Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis (vercel.com).", "The website is hosted by Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, United States (vercel.com)."),
        j((lang) => (lang === "fr"
          ? `Les comptes et les données saisies sont conservés dans une base de données fournie par Supabase (supabase.com), hébergée dans la région suivante : ${v("databaseRegion").fr}.`
          : `Accounts and submitted data are stored in a database provided by Supabase (supabase.com), hosted in the following region: ${v("databaseRegion").en}.`)),
      ],
    },
    {
      id: "objet",
      title: both("Objet du site", "Purpose of the website"),
      paragraphs: [
        both("Keyroom est une plateforme privée de mise en relation et de suivi de dossier dans le secteur hôtelier. L'espace de dossier est accessible uniquement sur invitation. Les questionnaires de cadrage sont accessibles par lien.",
          "Keyroom is a private platform for introductions and case follow-up in the hotel sector. The case area is accessible by invitation only. The scoping questionnaires are accessible by link."),
        both("Aucune information publiée ou recueillie par l'intermédiaire de ce site ne constitue une offre ferme, un conseil juridique, fiscal ou en investissement.",
          "No information published or collected through this website constitutes a firm offer, or legal, tax or investment advice."),
      ],
    },
    {
      id: "pi",
      title: both("Propriété intellectuelle", "Intellectual property"),
      paragraphs: [
        both("Les éléments du site (nom Keyroom, logo, textes, présentation, structure) sont protégés. Toute reproduction, représentation ou réutilisation, totale ou partielle, sans autorisation écrite préalable de l'éditeur est interdite.",
          "The elements of the website (Keyroom name, logo, texts, presentation, structure) are protected. Any reproduction, representation or reuse, in whole or in part, without the publisher's prior written authorisation is prohibited."),
      ],
    },
    {
      id: "responsabilite",
      title: both("Responsabilité", "Liability"),
      paragraphs: [
        both("Les informations publiées sur ce site sont fournies à titre indicatif et peuvent être modifiées à tout moment. L'éditeur s'efforce d'en assurer l'exactitude, sans garantir leur exhaustivité ni leur mise à jour.",
          "The information published on this website is provided for guidance only and may be changed at any time. The publisher endeavours to keep it accurate, without guaranteeing that it is complete or up to date."),
        both("Les informations transmises par les parties sont relayées sans garantie. L'apporteur d'affaires procède à des vérifications raisonnables avec les moyens dont il dispose, sans obligation de vérification, et ne saurait être tenu responsable d'une information erronée transmise par l'une des parties.",
          "Information provided by the parties is relayed without guarantee. The business introducer carries out reasonable checks with the means available, without any obligation to verify, and cannot be held liable for inaccurate information provided by a party."),
        both("L'éditeur ne saurait être tenu responsable d'une indisponibilité temporaire du site ni des dommages résultant de son utilisation.",
          "The publisher cannot be held liable for any temporary unavailability of the website or for damage resulting from its use."),
      ],
    },
    {
      id: "donnees",
      title: both("Données personnelles", "Personal data"),
      paragraphs: [
        both("Les questionnaires et l'espace de dossier collectent des données personnelles (identification, coordonnées, informations professionnelles) afin de préparer la mise en relation et la rédaction d'un accord. Ces données sont destinées à l'éditeur et ne sont pas transmises à l'autre partie à ce stade.",
          "The questionnaires and the case area collect personal data (identification, contact details, professional information) in order to prepare the introduction and the drafting of an agreement. This data is intended for the publisher and is not passed on to the other party at this stage."),
        j((lang) => (lang === "fr"
          ? `Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à ${v("email").fr}.`
          : `You may request access to, correction of or deletion of your data by writing to ${v("email").en}.`)),
      ],
    },
    {
      id: "cookies",
      title: both("Cookies et stockage local", "Cookies and local storage"),
      paragraphs: [
        both("Le site n'utilise ni cookie publicitaire ni outil de mesure d'audience. Il utilise uniquement un cookie de session pour l'espace de dossier (connexion) et le stockage local de votre navigateur pour mémoriser votre choix de langue. Ces éléments sont strictement nécessaires au fonctionnement du site.",
          "The website uses no advertising cookies and no audience-measurement tools. It only uses a session cookie for the case area (sign-in) and your browser's local storage to remember your language choice. These items are strictly necessary for the website to work."),
      ],
    },
    {
      id: "droit",
      title: both("Droit applicable", "Governing law"),
      paragraphs: [
        j((lang) => (lang === "fr" ? `Les présentes mentions légales sont régies par ${v("governingLaw").fr}.` : `This legal notice is governed by ${v("governingLaw").en}.`)),
      ],
    },
  ];
}
