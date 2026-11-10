"use client";

import { useState } from "react";
import { GenericFlow } from "./GenericFlow";
import { Soon } from "./Soon";
import { REQ_LABEL, templateById } from "@/lib/demo/catalog";
import type { Draft } from "@/lib/demo/store";
import type { Req, Reveal, Step } from "@/lib/demo/types";

// Éditeurs partagés par les deux versions de la démonstration (questions, documents, processus).
type Ed = { d: Draft; upd: (patch: Partial<Draft>) => void };
const REQS = Object.keys(REQ_LABEL) as Req[];
const sides = [["sale", "Côté vente"], ["search", "Côté recherche"]] as const;
const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
export const normalize = (steps: Step[]): Step[] => { const gs = [...new Set(steps.map((x) => x.group))].sort((a, b) => a - b); return steps.map((x) => ({ ...x, group: gs.indexOf(x.group) + 1 })); };

export function applyPreset(d: Draft, preset: "simple" | "secure"): Draft {
  const t = templateById(d.templateId);
  return {
    ...d,
    steps: d.steps.map((x) => ({ ...x, enabled: preset === "secure" ? true : !t.simpleOff.includes(x.id) })),
    docReqs: d.docReqs.map((x) => ({ ...x, enabled: preset === "secure" ? true : x.required })),
    options: { ...d.options, revealRule: "both", preset },
  };
}

export function QuestionsEditor({ d, upd }: Ed) {
  return (
    <div className="kr-form">
      {sides.map(([side, label]) => {
        const qs = d.questions.filter((x) => x.side === side);
        return qs.length ? (
          <fieldset key={side} className="kr-fieldset"><legend>{label}</legend>
            {qs.map((x) => <label key={x.id} className="kr-switch"><input type="checkbox" checked={x.enabled} onChange={(e) => upd({ questions: d.questions.map((y) => (y.id === x.id ? { ...y, enabled: e.target.checked } : y)) })} /><span>{x.label}{x.required ? " (obligatoire)" : ""}</span></label>)}
          </fieldset>
        ) : null;
      })}
      {d.questions.length === 0 && <div className="kr-banner"><p>Ce modèle ne contient aucune question. Vous pourrez en ajouter dans la version complète.</p></div>}
      <fieldset className="kr-fieldset"><legend>Mandat</legend>
        <label className="kr-switch"><input type="checkbox" checked={d.options.mandate} onChange={(e) => upd({ options: { ...d.options, mandate: e.target.checked } })} /><span>Générer un mandat de vente à partir des réponses, à valider, signer puis envoyer</span></label>
        <p className="kr-hint">Signature électronique certifiée : <Soon /> (simulation dans la démonstration).</p>
      </fieldset>
    </div>
  );
}

export function DocsEditor({ d, upd }: Ed) {
  return (
    <div className="kr-form">
      {sides.map(([side, label]) => {
        const ds = d.docReqs.filter((x) => x.side === side || x.side === "all");
        return ds.length ? (
          <fieldset key={side} className="kr-fieldset"><legend>{label}</legend>
            <ul className="kr-list">
              {ds.map((x) => (
                <li key={x.id}>
                  <label className="kr-switch"><input type="checkbox" checked={x.enabled} onChange={(e) => upd({ docReqs: d.docReqs.map((y) => (y.id === x.id ? { ...y, enabled: e.target.checked } : y)) })} /><span>{x.label}</span></label>
                  {x.enabled && <div className="kr-row">
                    <label className="kr-switch"><input type="checkbox" checked={x.required} onChange={(e) => upd({ docReqs: d.docReqs.map((y) => (y.id === x.id ? { ...y, required: e.target.checked } : y)) })} /><span>Obligatoire</span></label>
                    <label className="kr-switch"><input type="checkbox" checked={x.adminAccess} onChange={(e) => upd({ docReqs: d.docReqs.map((y) => (y.id === x.id ? { ...y, adminAccess: e.target.checked } : y)) })} /><span>Accès administrateur</span></label>
                  </div>}
                  {x.soon && <p className="kr-hint">{x.soon} <Soon /></p>}
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null;
      })}
      {d.docReqs.length === 0 && <div className="kr-banner"><p>Ce modèle ne demande aucun document.</p></div>}
    </div>
  );
}

export function ProcessEditor({ d, setD, upd, warnings }: Ed & { setD: (d: Draft) => void; warnings: { level: "warning" | "info"; text: string }[] }) {
  const [newTitle, setNewTitle] = useState("");
  const patchStep = (id: string, patch: Partial<Step>) => upd({ steps: d.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const moveGroup = (id: string, dir: -1 | 1) => {
    const groups = [...new Set(d.steps.map((x) => x.group))].sort((a, b) => a - b);
    const cur = d.steps.find((x) => x.id === id)!.group; const i = groups.indexOf(cur); const j = i + dir;
    if (j < 0 || j >= groups.length) return;
    upd({ steps: normalize(d.steps.map((x) => (x.group === groups[i] ? { ...x, group: groups[j] } : x.group === groups[j] ? { ...x, group: groups[i] } : x))) });
  };
  return (
    <div className="kr-form">
      <div className="kr-row">
        <button type="button" className={`kr-btn kr-btn--small ${d.options.preset === "simple" ? "kr-btn--primary" : "kr-btn--outline"}`} onClick={() => setD(applyPreset(d, "simple"))}>Version simplifiée</button>
        <button type="button" className={`kr-btn kr-btn--small ${d.options.preset === "secure" ? "kr-btn--primary" : "kr-btn--outline"}`} onClick={() => setD(applyPreset(d, "secure"))}>Version sécurisée</button>
      </div>
      <GenericFlow steps={d.steps} showStatus={false} />
      {warnings.length > 0 && <div className="kr-banner kr-banner--warn" role="note"><p><strong>Vérification de cohérence</strong></p>{warnings.map((w, i) => <p key={i}>{w.level === "warning" ? "À vérifier : " : "Information : "}{w.text}</p>)}</div>}
      <fieldset className="kr-fieldset"><legend>Révélation des informations</legend>
        <label className="kr-switch"><input type="radio" name="rr" checked={d.options.revealRule === "both"} onChange={() => upd({ options: { ...d.options, revealRule: "both", preset: "custom" } })} /><span>Les parties valident ensemble (recommandé)</span></label>
        <label className="kr-switch"><input type="radio" name="rr" checked={d.options.revealRule === "admin"} onChange={() => upd({ options: { ...d.options, revealRule: "admin", preset: "custom" } })} /><span>L'administrateur décide seul</span></label>
      </fieldset>
      <h2 className="kr-title-3">Modifier les étapes</h2>
      <ul className="kr-list">
        {[...d.steps].sort((a, b) => a.group - b.group).map((x) => (
          <li key={x.id}>
            <label className="kr-switch"><input type="checkbox" checked={x.enabled} onChange={(e) => patchStep(x.id, { enabled: e.target.checked })} /><span><strong>{x.title}</strong><br /><span className="kr-small">Rang {x.group}{x.side ? ` · ${x.side === "sale" ? "côté vente" : "côté recherche"}` : ""}</span></span></label>
            <details className="kr-details"><summary>Modifier cette étape</summary>
              <div className="kr-form">
                <div className="kr-field"><label htmlFor={`t-${x.id}`}>Titre</label><input id={`t-${x.id}`} className="kr-input" value={x.title} onChange={(e) => patchStep(x.id, { title: e.target.value })} /></div>
                <div className="kr-field"><label htmlFor={`s-${x.id}`}>Précision</label><input id={`s-${x.id}`} className="kr-input" value={x.sub} onChange={(e) => patchStep(x.id, { sub: e.target.value })} /></div>
                <fieldset className="kr-fieldset"><legend>Ce qui est attendu pour valider</legend>
                  {REQS.map((r) => <label key={r} className="kr-switch"><input type="checkbox" checked={x.requires.includes(r)} onChange={() => patchStep(x.id, { requires: toggleIn<Req>(x.requires, r) })} /><span>{REQ_LABEL[r][0].toUpperCase() + REQ_LABEL[r].slice(1)}</span></label>)}
                </fieldset>
                <fieldset className="kr-fieldset"><legend>Ce que l'étape révèle</legend>
                  {(["documents", "identities"] as Reveal[]).map((r) => <label key={r} className="kr-switch"><input type="checkbox" checked={x.reveals.includes(r)} onChange={() => patchStep(x.id, { reveals: toggleIn<Reveal>(x.reveals, r) })} /><span>{r === "documents" ? "Les documents" : "Les identités"}</span></label>)}
                </fieldset>
                <div className="kr-row">
                  <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => moveGroup(x.id, -1)}>Monter</button>
                  <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => moveGroup(x.id, 1)}>Descendre</button>
                  {x.custom && <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => upd({ steps: normalize(d.steps.filter((y) => y.id !== x.id)) })}>Supprimer</button>}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <form className="kr-form" onSubmit={(e) => { e.preventDefault(); if (!newTitle.trim()) return; const g = Math.max(0, ...d.steps.map((x) => x.group)) + 1; upd({ steps: [...d.steps, { id: `c${Math.random().toString(36).slice(2, 9)}`, title: newTitle.trim(), sub: "Étape ajoutée", group: g, enabled: true, requires: [], reveals: [], status: "upcoming", custom: true }] }); setNewTitle(""); }}>
        <div className="kr-field"><label htmlFor="nt">Ajouter une étape</label><input id="nt" className="kr-input" value={newTitle} placeholder="Par exemple : visite du bien" onChange={(e) => setNewTitle(e.target.value)} /></div>
        <button type="submit" className="kr-btn kr-btn--outline">Ajouter à la fin du processus</button>
      </form>
    </div>
  );
}
