import { REQ_LABEL, ROLES } from "./catalog";
import type { Participant, Project, Step } from "./types";

export const isParty = (p: Participant) => ROLES[p.role].side !== undefined;
export const sideOf = (p: Participant) => ROLES[p.role].side;
const partiesOf = (pr: Project) => pr.participants.filter(isParty);

// Documents et questions qui concernent un participant (selon sa partie).
export const docsFor = (pr: Project, p: Participant) => pr.docReqs.filter((d) => d.enabled && (d.side === "all" || d.side === sideOf(p)));
export const questionsFor = (pr: Project, p: Participant) => pr.questions.filter((x) => x.enabled && x.side === sideOf(p));

export function docProgress(pr: Project, p: Participant) {
  const reqs = docsFor(pr, p).filter((d) => d.required);
  const done = reqs.filter((d) => p.docs[d.id]).length;
  return { done, total: reqs.length, complete: done === reqs.length };
}
export const formDone = (pr: Project, p: Participant) => questionsFor(pr, p).length === 0 || p.submitted;

// Une étape est-elle prête à être validée ? Renvoie ce qu'il manque.
export function stepReady(pr: Project, st: Step): { ok: boolean; missing: string[] } {
  const parties = st.side ? partiesOf(pr).filter((p) => sideOf(p) === st.side) : partiesOf(pr);
  const missing: string[] = [];
  const names = (list: Participant[]) => list.map((p) => p.name).join(", ");
  if (st.requires.includes("agreement")) { const m = parties.filter((p) => !p.signed[st.id]); if (m.length) missing.push(`Signature : ${names(m)}`); }
  if (st.requires.includes("forms")) { const m = parties.filter((p) => !formDone(pr, p)); if (m.length) missing.push(`Questionnaire : ${names(m)}`); }
  if (st.requires.includes("docs")) { const m = parties.filter((p) => !docProgress(pr, p).complete); if (m.length) missing.push(`Documents : ${names(m)}`); }
  if (st.requires.includes("approval")) {
    const who = pr.options.revealRule === "admin" ? [] : parties;
    const m = who.filter((p) => !p.approved[st.id]); if (m.length) missing.push(`Accord de révélation : ${names(m)}`);
  }
  return { ok: missing.length === 0, missing };
}

export const enabledSteps = (pr: Project) => pr.steps.filter((x) => x.enabled);
export const currentGroup = (pr: Project) => enabledSteps(pr).find((x) => x.status !== "done")?.group;

// Recalcule l'état des étapes : une étape « en cours » est dans le premier groupe non terminé.
export function refreshStatus(steps: Step[]): Step[] {
  const first = steps.filter((x) => x.enabled && x.status !== "done").map((x) => x.group).sort((a, b) => a - b)[0];
  return steps.map((x) => (!x.enabled ? { ...x, status: "upcoming" } : x.status === "done" ? x : { ...x, status: x.group === first ? "current" : "upcoming" }));
}

// Contrôle de cohérence : avertit sans interdire.
export function checkProcess(pr: Project): { level: "warning" | "info"; text: string }[] {
  const steps = enabledSteps(pr).sort((a, b) => a.group - b.group);
  const out: { level: "warning" | "info"; text: string }[] = [];
  const firstAgreement = steps.findIndex((x) => x.requires.includes("agreement"));
  const firstDocReveal = steps.findIndex((x) => x.reveals.includes("documents"));
  const firstIdReveal = steps.findIndex((x) => x.reveals.includes("identities"));
  if (steps.length < 3) out.push({ level: "warning", text: "Le processus compte moins de trois étapes : les parties ont peu de garde-fous." });
  if (firstAgreement === -1) out.push({ level: "warning", text: "Aucun accord signé dans le processus : les parties ne s'engagent pas sur le déroulé ni sur la confidentialité." });
  else if (firstAgreement > 0) out.push({ level: "info", text: "Le premier accord signé n'est pas au démarrage : des échanges ont lieu avant tout engagement." });
  if (firstDocReveal !== -1 && (firstAgreement === -1 || firstAgreement > firstDocReveal)) out.push({ level: "warning", text: "Des documents sont révélés avant la signature d'un accord de confidentialité." });
  if (firstDocReveal !== -1 && !steps[firstDocReveal].requires.includes("approval") && pr.options.revealRule === "both") out.push({ level: "info", text: "L'étape qui révèle les documents ne demande pas l'accord explicite des parties." });
  if (firstIdReveal !== -1 && (firstAgreement === -1 || firstAgreement > firstIdReveal)) out.push({ level: "warning", text: "Les identités sont révélées avant la signature d'un accord." });
  if (pr.options.revealRule === "admin") out.push({ level: "warning", text: "La révélation ne dépend que de l'administrateur : les parties n'ont pas de droit de regard." });
  if (!enabledSteps(pr).some((x) => x.requires.includes("docs")) && pr.docReqs.some((x) => x.enabled && x.required)) out.push({ level: "info", text: "Des documents sont demandés mais aucune étape n'attend leur dépôt." });
  return out;
}

export const missingLabel = (r: keyof typeof REQ_LABEL) => REQ_LABEL[r];
