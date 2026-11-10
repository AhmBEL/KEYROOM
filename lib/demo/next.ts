import { docProgress, enabledSteps, isParty, questionsFor, sideOf } from "./rules";
import type { Participant, Project } from "./types";

export type TaskKind = "accept" | "questions" | "docs" | "sign" | "approve" | "mandate";
export type Task = { id: string; kind: TaskKind; stepId?: string; label: string; hint?: string; done: boolean; actionable: boolean };

// Les tâches d'un participant, dans l'ordre : accepter, répondre, déposer, signer, valider la révélation, mandat.
// « actionable » : on peut la faire maintenant (les signatures et accords des étapes futures sont listés mais pas encore ouverts).
export function tasksFor(pr: Project, me: Participant): Task[] {
  const out: Task[] = [];
  const party = isParty(me);
  if (!me.isAdmin) out.push({ id: "accept", kind: "accept", label: "Accepter le processus", hint: "Lisez-le, puis acceptez ou demandez une modification", done: me.accepted === "accepted", actionable: true });
  if (!party) return out;

  const qs = questionsFor(pr, me);
  if (qs.length) out.push({ id: "questions", kind: "questions", label: "Répondre au questionnaire", hint: `${qs.length} question${qs.length > 1 ? "s" : ""} · environ ${Math.max(1, Math.round(qs.length * 0.3))} min`, done: me.submitted, actionable: true });
  const dp = docProgress(pr, me);
  if (dp.total > 0) out.push({ id: "docs", kind: "docs", label: "Déposer vos documents", hint: `${dp.done} sur ${dp.total} obligatoires`, done: dp.complete, actionable: true });

  const steps = [...enabledSteps(pr)].sort((a, b) => a.group - b.group).filter((s) => !s.side || s.side === sideOf(me));
  for (const s of steps) {
    if (s.requires.includes("agreement")) out.push({ id: `sign:${s.id}`, kind: "sign", stepId: s.id, label: `Signer : ${s.title}`, hint: s.sub, done: Boolean(me.signed[s.id]), actionable: s.status === "current" });
    if (s.requires.includes("approval") && pr.options.revealRule === "both") out.push({ id: `approve:${s.id}`, kind: "approve", stepId: s.id, label: `Donner votre accord : ${s.title}`, hint: s.reveals.length ? `Révèle ${s.reveals.map((r) => (r === "documents" ? "les documents" : "les identités")).join(" et ")}` : s.sub, done: Boolean(me.approved[s.id]), actionable: s.status === "current" });
  }
  if (pr.options.mandate && sideOf(me) === "sale" && me.mandate) out.push({ id: "mandate", kind: "mandate", label: "Signer le mandat", hint: "Généré à partir de vos réponses", done: me.mandate.status === "signed" || me.mandate.status === "sent", actionable: me.mandate.status === "validated" });
  return out;
}

export const progressOf = (tasks: Task[]) => (tasks.length ? tasks.filter((t) => t.done).length / tasks.length : 1);
export const nextTask = (tasks: Task[]) => tasks.find((t) => !t.done && t.actionable);

export function projectProgress(pr: Project) {
  const steps = enabledSteps(pr);
  return steps.length ? steps.filter((s) => s.status === "done").length / steps.length : 0;
}
export function journey(pr: Project) {
  const steps = enabledSteps(pr); const groups = [...new Set(steps.map((s) => s.group))].sort((a, b) => a - b);
  const cur = groups.find((g) => steps.some((s) => s.group === g && s.status !== "done"));
  return groups.map((g) => { const list = steps.filter((s) => s.group === g); return { done: list.every((s) => s.status === "done"), current: g === cur, label: list.map((s) => s.title).join(" · ") }; });
}

import { stepReady } from "./rules";

// Ce que l'administrateur doit regarder : demandes de modification, invitations sans réponse, étapes à valider.
export function adminAgenda(pr: Project) {
  const pending = pr.participants.filter((p) => !p.isAdmin && p.accepted !== "accepted");
  const openChanges = pr.changes.filter((c) => c.status === "open").length;
  const current = enabledSteps(pr).filter((s) => s.status === "current").map((s) => ({ step: s, ...stepReady(pr, s) }));
  return { pending, openChanges, current };
}

// Une phrase « prochaine action » pour la liste des projets.
export function nextLine(pr: Project, me: Participant): string {
  if (me.isAdmin) {
    const a = adminAgenda(pr);
    if (a.openChanges) return `Répondre à ${a.openChanges} demande${a.openChanges > 1 ? "s" : ""} de modification`;
    if (a.pending.length) return `En attente de ${a.pending.map((p) => p.name.split(" ")[0]).join(", ")}`;
    const ready = a.current.find((c) => c.ok);
    if (ready) return `Valider : ${ready.step.title}`;
    if (a.current.length) return "En attente des parties";
    return "Processus terminé";
  }
  const t = nextTask(tasksFor(pr, me));
  return t ? t.label : "En attente des autres parties";
}
