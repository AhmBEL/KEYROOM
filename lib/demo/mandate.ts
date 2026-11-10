import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Participant, Project } from "./types";

// Mandat généré dans le navigateur à partir des réponses. Document de démonstration, sans valeur juridique.
export async function buildMandatePdf(pr: Project, owner: Participant, agent: Participant, signature?: { by: string; at: string; image?: string }) {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman), bold = await pdf.embedFont(StandardFonts.TimesRomanBold), sans = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595.28, 841.89]); const M = 56; const W = 595.28 - 2 * M; let y = 841.89 - M;
  const INK = rgb(0.043, 0.122, 0.2), MUTED = rgb(0.35, 0.39, 0.44);

  const wrap = (t: string, f: typeof serif, size: number) => {
    const out: string[] = []; let line = "";
    for (const w of t.split(/\s+/)) { const test = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(test, size) > W && line) { out.push(line); line = w; } else line = test; }
    if (line) out.push(line); return out;
  };
  const para = (t: string, o: { f?: typeof serif; size?: number; gap?: number } = {}) => {
    const f = o.f ?? serif, size = o.size ?? 11;
    for (const l of wrap(t, f, size)) { page.drawText(l, { x: M, y: y - size, size, font: f, color: rgb(0.17, 0.18, 0.2) }); y -= size * 1.5; }
    y -= o.gap ?? 6;
  };

  page.drawText("DÉMONSTRATION — document sans valeur juridique", { x: M, y: y - 9, size: 9, font: sans, color: rgb(0.54, 0.416, 0.184) }); y -= 30;
  page.drawText("Mandat de vente", { x: M, y: y - 22, size: 22, font: bold, color: INK }); y -= 40;
  para(`Projet : ${pr.name}`, { f: bold });
  para(`Établi le ${new Date().toLocaleDateString("fr-FR")}`, { gap: 14 });

  para("Entre les soussignés", { f: bold, gap: 3 });
  para(`Le mandant : ${owner.name}${owner.email ? `, ${owner.email}` : ""}.`);
  para(`Le mandataire : ${agent.name}${agent.email ? `, ${agent.email}` : ""}.`, { gap: 14 });

  para("Objet du mandat", { f: bold, gap: 3 });
  const rows = pr.questions.filter((x) => x.enabled && x.side === "sale").map((x) => [x.label, owner.answers[x.id]] as const).filter(([, v]) => v);
  if (rows.length) for (const [label, v] of rows) para(`${label} : ${v}`, { gap: 2 });
  else para("Les caractéristiques du bien seront précisées par le mandant.");
  y -= 10;
  para("Le mandant confie au mandataire la mission de présenter le bien à des acquéreurs identifiés et de conduire le processus de vente convenu entre les parties. La commission, la durée et les conditions de résiliation sont fixées avant signature.", { gap: 14 });

  para("Signatures", { f: bold, gap: 8 });
  page.drawText("Le mandant", { x: M, y: y - 11, size: 11, font: bold, color: INK });
  page.drawText("Le mandataire", { x: M + W / 2, y: y - 11, size: 11, font: bold, color: INK });
  if (signature) {
    let drawn = false;
    if (signature.image?.startsWith("data:image/png")) {
      try {
        const img = await pdf.embedPng(signature.image); const h = 40; const w = Math.min(160, (img.width / img.height) * h);
        page.drawImage(img, { x: M, y: y - 52, width: w, height: h }); drawn = true;
      } catch { /* retombe sur la signature tapée */ }
    }
    if (!drawn) page.drawText(signature.by, { x: M, y: y - 38, size: 16, font: serif, color: INK });
    page.drawText(`Signé électroniquement (simulation) le ${new Date(signature.at).toLocaleString("fr-FR")}`, { x: M, y: y - 54, size: 8, font: sans, color: MUTED });
  }
  page.drawLine({ start: { x: M, y: y - 62 }, end: { x: M + W / 2 - 20, y: y - 62 }, thickness: 0.6, color: MUTED });
  page.drawLine({ start: { x: M + W / 2, y: y - 62 }, end: { x: M + W, y: y - 62 }, thickness: 0.6, color: MUTED });
  return pdf.save();
}

export function openPdf(bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
