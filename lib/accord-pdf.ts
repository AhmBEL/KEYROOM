import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { display, type Answers } from "./questionnaire";

// L'intermédiaire. À confirmer par Ahmed (entité exacte, immatriculation).
export const INTERMEDIAIRE = { nom: "Ahmed Belhadj", libelle: "l'Intermédiaire" };

export type AccordSettings = {
  droit_applicable: "maurice_arbitrage" | "anglais";
  duree_protection_mois: number;
  duree_confidentialite_ans: number;
  repartition: { mandat: number; investisseurs: number; ahmed: number };
};
export type AccordInput = {
  reference: string;
  generatedAt: Date;
  mandat: Answers;
  investisseurs: Answers;
  steps: string[];
  settings: AccordSettings;
};

const A4 = { w: 595.28, h: 841.89 };
const M = 56;
const INK = rgb(0.043, 0.122, 0.2);
const GOLD = rgb(0.54, 0.416, 0.184);
const MUTED = rgb(0.35, 0.39, 0.44);
const NOTICE = "Projet à faire relire par un avocat avant signature";

function partyLines(a: Answers): string[] {
  const societe = a.signe_en_tant_que === "Société";
  const lines = [
    societe ? `${display(a.raison_sociale)}, représentée par ${display(a.nom_prenom)}` : display(a.nom_prenom),
    `Pays : ${display(a.pays)}`,
  ];
  if (societe && a.immatriculation) lines.push(`Immatriculation : ${display(a.immatriculation)}`);
  if (a.fonction) lines.push(`Fonction du signataire : ${display(a.fonction)}`);
  if (a.pouvoir) lines.push(`Pouvoir de signature : ${display(a.pouvoir)}`);
  return lines;
}

export async function buildAccordPdf(input: AccordInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Accord tripartite — ${input.reference}`);
  pdf.setAuthor("Keyroom");
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const width = A4.w - 2 * M;

  const newPage = () => { page = pdf.addPage([A4.w, A4.h]); y = A4.h - M; };
  const ensure = (h: number) => { if (y - h < M + 24) newPage(); };

  function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = word; } else line = test;
      }
      out.push(line);
    }
    return out;
  }
  function paragraph(text: string, opts: { font?: PDFFont; size?: number; indent?: number; gap?: number; color?: ReturnType<typeof rgb> } = {}) {
    const font = opts.font ?? serif, size = opts.size ?? 11, indent = opts.indent ?? 0, lead = size * 1.45;
    for (const l of wrap(text, font, size, width - indent)) {
      ensure(lead);
      page.drawText(l, { x: M + indent, y: y - size, size, font, color: opts.color ?? rgb(0.17, 0.18, 0.2) });
      y -= lead;
    }
    y -= opts.gap ?? 6;
  }
  function heading(text: string) {
    ensure(90); // évite un titre seul en bas de page
    y -= 8;
    page.drawText(text, { x: M, y: y - 14, size: 14, font: serifBold, color: INK });
    y -= 16;
    page.drawLine({ start: { x: M, y: y - 3 }, end: { x: M + 40, y: y - 3 }, thickness: 1.2, color: GOLD });
    y -= 12;
  }

  // Couverture
  page.drawText("KEYROOM", { x: M, y: y - 12, size: 12, font: sansBold, color: GOLD });
  y -= 40;
  page.drawText("Accord de commission et de non-contournement", { x: M, y: y - 22, size: 20, font: serifBold, color: INK });
  y -= 30;
  page.drawText("Accord tripartite", { x: M, y: y - 14, size: 14, font: serif, color: MUTED });
  y -= 34;
  page.drawText(`Référence du dossier : ${input.reference}`, { x: M, y: y - 11, size: 11, font: sansBold, color: INK });
  y -= 18;
  const d = input.generatedAt;
  page.drawText(`Généré le ${d.toLocaleDateString("fr-FR", { timeZone: "UTC" })}`, { x: M, y: y - 10, size: 10, font: sans, color: MUTED });
  y -= 22;
  ensure(40);
  page.drawRectangle({ x: M, y: y - 26, width, height: 30, color: rgb(0.91, 0.87, 0.81) });
  page.drawText(NOTICE, { x: M + 10, y: y - 16, size: 11, font: sansBold, color: INK });
  y -= 46;

  const s = input.settings;
  const r = s.repartition;
  const droit = s.droit_applicable === "maurice_arbitrage"
    ? "Le présent accord est régi par le droit de la République de Maurice. Tout litige qui n'aura pas été réglé à l'amiable sera tranché définitivement par arbitrage, selon un règlement, un siège et un nombre d'arbitres à préciser avant signature."
    : "Le présent accord est régi par le droit anglais. Tout litige qui n'aura pas été réglé à l'amiable sera soumis à la juridiction ou à l'arbitrage à préciser avant signature.";

  heading("1. Identification des parties");
  paragraph("Entre les soussignés :", { gap: 4 });
  paragraph("La Partie Mandat, détentrice de mandats de vente d'hôtels :", { font: serifBold, gap: 2 });
  for (const l of partyLines(input.mandat)) paragraph(l, { indent: 14, gap: 1 });
  y -= 6;
  paragraph("La Partie Investisseurs, représentant des investisseurs :", { font: serifBold, gap: 2 });
  for (const l of partyLines(input.investisseurs)) paragraph(l, { indent: 14, gap: 1 });
  y -= 6;
  paragraph(`Et ${INTERMEDIAIRE.nom}, ${INTERMEDIAIRE.libelle}.`, { font: serifBold });
  paragraph("Ensemble, « les Parties ».");

  heading("2. Objet et périmètre");
  paragraph("Les Parties souhaitent faire aboutir, avec l'aide de l'Intermédiaire, la vente d'un ou plusieurs hôtels détenus en mandat par la Partie Mandat à un ou plusieurs investisseurs représentés par la Partie Investisseurs. Le présent accord fixe les règles de rémunération, de protection et de confidentialité applicables à cette mise en relation.");
  paragraph("Chaque partie ne partage que ce que l'étape en cours justifie. Aucun nom d'hôtel, aucun nom d'investisseur et aucun chiffre confidentiel n'est transmis avant l'étape prévue par le process en annexe.");

  heading("3. Process par étapes");
  paragraph("Les Parties suivent le process décrit en annexe. L'Intermédiaire fait avancer le dossier d'une étape à l'autre et décide du moment où un document est transmis à l'autre partie.");

  heading("4. Commission");
  paragraph("La commission n'est due qu'à la réalisation de la vente. Elle est calculée sur la commission totale effectivement perçue, et payée à la clôture, par l'intermédiaire d'un notaire ou d'un avocat.");
  paragraph("Répartition de la commission totale perçue :", { gap: 2 });
  paragraph(`Partie Mandat : ${r.mandat} %`, { indent: 14, gap: 1 });
  paragraph(`Partie Investisseurs : ${r.investisseurs} %`, { indent: 14, gap: 1 });
  paragraph(`Intermédiaire : ${r.ahmed} %`, { indent: 14 });

  heading("5. Protection de la commission");
  paragraph(`La commission de l'Intermédiaire reste due si la vente se conclut avec un acheteur qu'il a introduit, même sans son intervention ultérieure, pendant ${s.duree_protection_mois} mois à compter de la première mise en relation.`);

  heading("6. Non-contournement");
  paragraph(`Pendant ${s.duree_protection_mois} mois, aucune des trois Parties ne contourne les autres pour traiter directement avec une personne qui lui a été présentée dans le cadre du présent accord. Cet engagement s'étend aux sociétés liées de chaque Partie : holdings, fonds et filiales.`);

  heading("7. Confidentialité");
  paragraph(`Les Parties gardent confidentielles toutes les informations échangées dans le cadre du dossier, pendant ${s.duree_confidentialite_ans} ans à compter de la signature. Elles ne les utilisent que pour la réalisation de l'opération.`);

  heading("8. Droit applicable et règlement des litiges");
  paragraph(droit);

  const remarques = [
    ["Partie Mandat", input.mandat.remarque],
    ["Partie Investisseurs", input.investisseurs.remarque],
  ].filter(([, v]) => v);
  if (remarques.length) {
    heading("Remarques exprimées par les Parties");
    for (const [who, v] of remarques) paragraph(`${who} : ${display(v as string)}`);
  }

  heading("9. Signatures");
  paragraph("Fait en trois exemplaires, un pour chaque Partie.");
  const blocks = ["Partie Mandat", "Partie Investisseurs", "Intermédiaire"];
  ensure(110);
  const colW = width / 3;
  blocks.forEach((b, i) => {
    const x = M + i * colW;
    page.drawText(b, { x, y: y - 11, size: 11, font: serifBold, color: INK });
    page.drawText("Nom :", { x, y: y - 34, size: 10, font: sans, color: MUTED });
    page.drawText("Date :", { x, y: y - 54, size: 10, font: sans, color: MUTED });
    page.drawText("Signature :", { x, y: y - 74, size: 10, font: sans, color: MUTED });
    page.drawLine({ start: { x, y: y - 100 }, end: { x: x + colW - 16, y: y - 100 }, thickness: 0.6, color: MUTED });
  });
  y -= 112;

  newPage();
  heading("Annexe : le process en 9 étapes");
  input.steps.forEach((label, i) => paragraph(`${i + 1}.  ${label}`, { gap: 4 }));

  // Pied de page sur chaque page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M - 6 }, end: { x: A4.w - M, y: M - 6 }, thickness: 0.4, color: rgb(0.85, 0.81, 0.74) });
    p.drawText(`${NOTICE}  ·  ${input.reference}`, { x: M, y: M - 20, size: 8, font: sans, color: MUTED });
    const t = `Page ${i + 1} / ${pages.length}`;
    p.drawText(t, { x: A4.w - M - sans.widthOfTextAtSize(t, 8), y: M - 20, size: 8, font: sans, color: MUTED });
  });

  return pdf.save();
}
