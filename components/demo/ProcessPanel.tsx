"use client";

import { useState } from "react";
import { GenericFlow } from "./GenericFlow";
import { REQ_LABEL } from "@/lib/demo/catalog";
import { checkProcess, enabledSteps } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project } from "@/lib/demo/types";

const ACC = { pending: "n'a pas encore répondu", accepted: "a accepté le processus", changes: "demande des modifications" } as const;

// Processus : visible par tous. L'administrateur le modifie et tranche les demandes ; chaque participant l'accepte
// ou demande un changement (retirer une étape, en ajouter une, laisser un commentaire).
export function ProcessPanel({ pr, me, name }: { pr: Project; me: Participant; name: (p: Participant) => string }) {
  const { mutate } = useDemo();
  const isAdmin = me.isAdmin;
  const [kind, setKind] = useState<"remove" | "add" | "comment">("comment");
  const [stepId, setStepId] = useState("");
  const [text, setText] = useState("");
  const warnings = checkProcess(pr);
  const open = pr.changes.filter((c) => c.status === "open");
  const mine = pr.changes.filter((c) => c.by === me.id);

  const resolve = (id: string, accept: boolean) => {
    const c = pr.changes.find((x) => x.id === id)!; const who = pr.participants.find((p) => p.id === c.by)?.name ?? "Participant";
    mutate(pr.id, (p) => {
      let steps = p.steps;
      if (accept && c.kind === "remove" && c.stepId) steps = steps.map((x) => (x.id === c.stepId ? { ...x, enabled: false } : x));
      if (accept && c.kind === "add") steps = [...steps, { id: `c${Date.now().toString(36)}`, title: c.text, sub: `Étape ajoutée à la demande de ${who}`, group: Math.max(0, ...steps.map((x) => x.group)) + 1, enabled: true, requires: [], reveals: [], status: "upcoming", custom: true }];
      const changes = p.changes.map((x) => (x.id === id ? { ...x, status: (accept ? "accepted" : "declined") as "accepted" | "declined" } : x));
      const participants = p.participants.map((x) => (x.id === c.by && !changes.some((y) => y.by === x.id && y.status === "open") ? { ...x, accepted: "accepted" as const } : x));
      return { ...p, steps, changes, participants };
    }, { who: me.name, text: `${accept ? "Demande acceptée" : "Demande refusée"} : ${c.kind === "remove" ? "retirer une étape" : c.kind === "add" ? `ajouter « ${c.text} »` : "commentaire"} (${who})` });
  };

  return (
    <div className="kr-grid">
      <h2 className="kr-title-3" style={{ margin: 0 }}>Processus proposé</h2>
      <GenericFlow steps={pr.steps} />

      {warnings.length > 0 && (
        <div className="kr-banner kr-banner--warn" role="note"><p><strong>Vérification de cohérence</strong></p>
          {warnings.map((w, i) => <p key={i}>{w.level === "warning" ? "À vérifier : " : "Information : "}{w.text}</p>)}
          <p>Ces points sont des avertissements : vous gardez la liberté d'organiser le processus comme vous le souhaitez.</p></div>
      )}

      <section className="kr-card">
        <p className="kr-card__ref">Acceptation du processus</p>
        <ul className="kr-list">
          {pr.participants.filter((p) => !p.isAdmin).map((p) => (
            <li key={p.id}><strong>{name(p)}</strong><span className="kr-small">{ACC[p.accepted]}</span></li>
          ))}
          {pr.participants.length === 1 && <li><span className="kr-small">Aucun participant invité.</span></li>}
        </ul>
      </section>

      {!isAdmin && (
        <section className="kr-card">
          <p className="kr-card__ref">Votre réponse</p>
          {me.accepted === "accepted" ? <p className="kr-success" role="status">Vous avez accepté ce processus.</p> : (
            <button type="button" className="kr-btn kr-btn--primary" onClick={() => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, accepted: "accepted" } : x)) }), { who: me.name, text: "A accepté le processus" })}>Accepter le processus</button>
          )}
          <form className="kr-form" onSubmit={(e) => {
            e.preventDefault();
            if (kind === "remove" && !stepId) return; if (kind !== "remove" && !text.trim()) return;
            mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, accepted: "changes" } : x)),
              changes: [...p.changes, { id: `r${Date.now().toString(36)}`, by: me.id, kind, stepId: kind === "remove" ? stepId : undefined, text: kind === "remove" ? (pr.steps.find((s) => s.id === stepId)?.title ?? "") : text.trim(), status: "open" }] }),
              { who: me.name, text: `Demande de modification : ${kind === "remove" ? "retirer une étape" : kind === "add" ? "ajouter une étape" : "commentaire"}` });
            setText(""); setStepId("");
          }}>
            <h3 className="kr-title-3">Demander une modification</h3>
            <div className="kr-field"><label htmlFor="ck">Type de demande</label>
              <select id="ck" className="kr-input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="comment">Laisser un commentaire</option><option value="remove">Retirer une étape</option><option value="add">Ajouter une étape</option>
              </select></div>
            {kind === "remove" ? (
              <div className="kr-field"><label htmlFor="cs">Étape à retirer</label>
                <select id="cs" className="kr-input" value={stepId} onChange={(e) => setStepId(e.target.value)}>
                  <option value="">Choisir…</option>{enabledSteps(pr).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select></div>
            ) : (
              <div className="kr-field"><label htmlFor="ct">{kind === "add" ? "Étape à ajouter" : "Votre commentaire"}</label><input id="ct" className="kr-input" value={text} onChange={(e) => setText(e.target.value)} /></div>
            )}
            <button type="submit" className="kr-btn kr-btn--outline">Envoyer la demande</button>
          </form>
          {mine.length > 0 && <ul className="kr-list">{mine.map((c) => <li key={c.id}><span>{c.kind === "remove" ? `Retirer : ${c.text}` : c.kind === "add" ? `Ajouter : ${c.text}` : `Commentaire : ${c.text}`}</span><span className="kr-pill">{c.status === "open" ? "En attente" : c.status === "accepted" ? "Acceptée" : "Refusée"}</span></li>)}</ul>}
        </section>
      )}

      {isAdmin && (
        <>
          <h3 className="kr-title-3">Demandes des participants {open.length ? `(${open.length})` : ""}</h3>
          {open.length === 0 ? <p className="kr-small">Aucune demande en attente.</p> : (
            <ul className="kr-list">{open.map((c) => (
              <li key={c.id}><strong>{pr.participants.find((p) => p.id === c.by)?.name}</strong>
                <span>{c.kind === "remove" ? `Retirer l'étape « ${c.text} »` : c.kind === "add" ? `Ajouter l'étape « ${c.text} »` : `Commentaire : ${c.text}`}</span>
                <div className="kr-row"><button type="button" className="kr-btn kr-btn--primary kr-btn--small" onClick={() => resolve(c.id, true)}>Accepter</button><button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => resolve(c.id, false)}>Refuser</button></div></li>
            ))}</ul>
          )}
          <h3 className="kr-title-3">Activer ou désactiver des étapes</h3>
          <ul className="kr-list">
            {[...pr.steps].sort((a, b) => a.group - b.group).map((s) => (
              <li key={s.id}><label className="kr-switch"><input type="checkbox" checked={s.enabled} disabled={s.status === "done"} onChange={(e) => mutate(pr.id, (p) => ({ ...p, steps: p.steps.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)) }), { who: me.name, text: `${e.target.checked ? "Étape activée" : "Étape désactivée"} : ${s.title}` })} /><span><strong>{s.title}</strong><br /><span className="kr-small">{s.requires.length ? "Attendu : " + s.requires.map((r) => REQ_LABEL[r]).join(", ") : "Aucun prérequis"}{s.reveals.length ? ` · révèle : ${s.reveals.map((r) => (r === "documents" ? "les documents" : "les identités")).join(", ")}` : ""}</span></span></label></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
