"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GenericFlow } from "@/components/demo/GenericFlow";
import { Soon } from "@/components/demo/Soon";
import { PROFILES, REQ_LABEL, ROLES, TEMPLATES, templateById } from "@/lib/demo/catalog";
import { checkProcess } from "@/lib/demo/rules";
import { draftFromTemplate, useDemo, type Draft } from "@/lib/demo/store";
import type { Project, Req, Reveal, RoleKind, Step } from "@/lib/demo/types";

const LABELS = ["Modèle", "Votre rôle", "Participants", "Informations", "Documents", "Processus", "Invitations"];
const REQS = Object.keys(REQ_LABEL) as Req[];
const normalize = (steps: Step[]): Step[] => { const gs = [...new Set(steps.map((x) => x.group))].sort((a, b) => a - b); return steps.map((x) => ({ ...x, group: gs.indexOf(x.group) + 1 })); };
const uid = () => Math.random().toString(36).slice(2, 9);

function applyPreset(d: Draft, preset: "simple" | "secure"): Draft {
  const t = templateById(d.templateId);
  return {
    ...d,
    steps: d.steps.map((x) => ({ ...x, enabled: preset === "secure" ? true : !t.simpleOff.includes(x.id) })),
    docReqs: d.docReqs.map((x) => ({ ...x, enabled: preset === "secure" ? true : x.required })),
    options: { ...d.options, revealRule: "both", preset },
  };
}

export default function NewProjectPage() {
  const router = useRouter();
  const { state, createProject } = useDemo();
  const profile = state.profile!;
  const myDefault: RoleKind = PROFILES.find((p) => p.kind === profile?.kind)?.role ?? "introducer";
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => draftFromTemplate("grosse", myDefault));
  const [error, setError] = useState<string | null>(null);
  const upd = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const t = templateById(d.templateId);

  // Un projet fictif servant uniquement aux contrôles et à l'aperçu.
  const preview = useMemo<Project>(() => ({
    id: "preview", name: d.name, templateId: d.templateId, createdAt: "", adminId: "", participants: [], steps: d.steps, docReqs: d.docReqs, questions: d.questions,
    options: d.options, revealed: { documents: false, identities: false }, changes: [], log: [], invited: false,
  }), [d]);
  const warnings = checkProcess(preview);

  const pickTemplate = (id: string) => setD((x) => ({ ...draftFromTemplate(id, x.myRole), name: x.name, participants: x.participants }));
  const suggest = () => {
    const mine = ROLES[d.myRole].side;
    const list: { name: string; email: string; role: RoleKind }[] = mine === "sale" ? [{ name: "", email: "", role: "search" }] : mine === "search" ? [{ name: "", email: "", role: "sale" }] : [{ name: "", email: "", role: "sale" }, { name: "", email: "", role: "search" }];
    upd({ participants: [...d.participants, ...list].slice(0, 6) });
  };

  const next = () => {
    setError(null);
    if (step === 2) {
      if (d.participants.some((p) => !p.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))) return setError("Chaque participant doit avoir un nom et une adresse email valide, ou être retiré.");
    }
    setStep((s) => Math.min(s + 1, LABELS.length - 1));
    window.scrollTo({ top: 0 });
  };
  const back = () => { setError(null); setStep((s) => Math.max(s - 1, 0)); window.scrollTo({ top: 0 }); };

  const moveGroup = (id: string, dir: -1 | 1) => {
    const groups = [...new Set(d.steps.map((x) => x.group))].sort((a, b) => a - b);
    const cur = d.steps.find((x) => x.id === id)!.group; const i = groups.indexOf(cur); const j = i + dir;
    if (j < 0 || j >= groups.length) return;
    upd({ steps: normalize(d.steps.map((x) => (x.group === groups[i] ? { ...x, group: groups[j] } : x.group === groups[j] ? { ...x, group: groups[i] } : x))) });
  };
  const patchStep = (id: string, patch: Partial<Step>) => upd({ steps: d.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const [newTitle, setNewTitle] = useState("");

  const sides = [["sale", "Côté vente"], ["search", "Côté recherche"]] as const;

  return (
    <>
      <p className="kr-eyebrow">Étape {step + 1} sur {LABELS.length} · {LABELS[step]}</p>
      <div className="kr-progress-dots" aria-hidden="true">{LABELS.map((_, k) => <i key={k} data-on={k <= step} />)}</div>

      {step === 0 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Quel modèle de départ ?</h1>
          <p className="kr-body">Chaque modèle est une proposition. Vous pourrez tout modifier ensuite, et les participants pourront demander des changements.</p>
          {TEMPLATES.map((tp) => (
            <label key={tp.id} className={`kr-card kr-choice${d.templateId === tp.id ? " kr-choice--on" : ""}`}>
              <input type="radio" name="tpl" className="kr-sr" checked={d.templateId === tp.id} onChange={() => pickTemplate(tp.id)} />
              <p className="kr-card__ref">{tp.tag}</p><h2 className="kr-title-3">{tp.name}</h2><p className="kr-small">{tp.blurb}</p>
            </label>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Votre rôle dans ce projet</h1>
          <div className="kr-field"><label htmlFor="pn">Nom du projet</label><input id="pn" className="kr-input" value={d.name} placeholder={t.name} onChange={(e) => upd({ name: e.target.value })} /><p className="kr-hint">Facultatif. Les parties verront ce nom.</p></div>
          <div className="kr-field"><label htmlFor="mr">Mon rôle</label>
            <select id="mr" className="kr-input" value={d.myRole} onChange={(e) => upd({ myRole: e.target.value as RoleKind })}>
              {(Object.keys(ROLES) as RoleKind[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
            <p className="kr-hint">Vous êtes l'administrateur du projet. Si votre rôle est « vente » ou « recherche », vous êtes aussi l'une des parties.</p></div>
        </div>
      )}

      {step === 2 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Qui invitez-vous ?</h1>
          <p className="kr-body">Ajoutez les participants (de 2 à 5 en plus de vous) et donnez-leur un rôle.</p>
          <ul className="kr-list">
            <li><strong>Vous</strong><span className="kr-small">{ROLES[d.myRole].label} · administrateur</span></li>
            {d.participants.map((p, i) => (
              <li key={i}>
                <div className="kr-field"><label htmlFor={`pa${i}`}>Nom</label><input id={`pa${i}`} className="kr-input" value={p.name} onChange={(e) => upd({ participants: d.participants.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} /></div>
                <div className="kr-field"><label htmlFor={`pe${i}`}>Email</label><input id={`pe${i}`} type="email" inputMode="email" className="kr-input" value={p.email} onChange={(e) => upd({ participants: d.participants.map((x, k) => (k === i ? { ...x, email: e.target.value } : x)) })} /></div>
                <div className="kr-field"><label htmlFor={`pr${i}`}>Rôle</label>
                  <select id={`pr${i}`} className="kr-input" value={p.role} onChange={(e) => upd({ participants: d.participants.map((x, k) => (k === i ? { ...x, role: e.target.value as RoleKind } : x)) })}>
                    {(Object.keys(ROLES) as RoleKind[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
                  </select></div>
                <button type="button" className="kr-link" onClick={() => upd({ participants: d.participants.filter((_, k) => k !== i) })}>Retirer ce participant</button>
              </li>
            ))}
          </ul>
          <div className="kr-row">
            <button type="button" className="kr-btn kr-btn--outline" disabled={d.participants.length >= 5} onClick={() => upd({ participants: [...d.participants, { name: "", email: "", role: "sale" }] })}>Ajouter un participant</button>
            <button type="button" className="kr-btn kr-btn--outline" disabled={d.participants.length >= 5} onClick={suggest}>Ajouter les parties attendues</button>
          </div>
          {error && <p className="kr-error" role="alert">{error}</p>}
        </div>
      )}

      {step === 3 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Quelles informations demander ?</h1>
          <p className="kr-body">Chaque participant reçoit un questionnaire selon son rôle. Désactivez ce dont vous n'avez pas besoin.</p>
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
      )}

      {step === 4 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Quels documents demander ?</h1>
          <p className="kr-body">Chacun dépose ses documents dans son espace privé. L'« accès administrateur » permet à l'administrateur de les consulter ; sans cette case, il ne voit que l'état d'avancement.</p>
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
      )}

      {step === 5 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Le processus</h1>
          <p className="kr-body">Voici le processus proposé. Les participants pourront l'accepter ou demander des modifications. Choisissez une version, puis ajustez.</p>
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
          <form className="kr-form" onSubmit={(e) => { e.preventDefault(); if (!newTitle.trim()) return; const g = Math.max(0, ...d.steps.map((x) => x.group)) + 1; upd({ steps: [...d.steps, { id: `c${uid()}`, title: newTitle.trim(), sub: "Étape ajoutée", group: g, enabled: true, requires: [], reveals: [], status: "upcoming", custom: true }] }); setNewTitle(""); }}>
            <div className="kr-field"><label htmlFor="nt">Ajouter une étape</label><input id="nt" className="kr-input" value={newTitle} placeholder="Par exemple : visite du bien" onChange={(e) => setNewTitle(e.target.value)} /></div>
            <button type="submit" className="kr-btn kr-btn--outline">Ajouter à la fin du processus</button>
          </form>
        </div>
      )}

      {step === 6 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Récapitulatif</h1>
          <section className="kr-card"><p className="kr-card__ref">{t.name}</p><h2 className="kr-title-3">{d.name || t.name}</h2>
            <p className="kr-small">Vous : {ROLES[d.myRole].label} (administrateur)</p>
            {d.participants.map((p, i) => <p key={i} className="kr-small">{p.name} · {ROLES[p.role].label} · {p.email}</p>)}
            {d.participants.length === 0 && <p className="kr-small">Aucun participant invité : vous pourrez en ajouter plus tard.</p>}
          </section>
          <p className="kr-small">{d.steps.filter((x) => x.enabled).length} étapes · {d.questions.filter((x) => x.enabled).length} questions · {d.docReqs.filter((x) => x.enabled).length} documents demandés · révélation : {d.options.revealRule === "both" ? "par les parties ensemble" : "par l'administrateur seul"}</p>
          {warnings.length > 0 && <div className="kr-banner kr-banner--warn" role="note">{warnings.map((w, i) => <p key={i}>{w.text}</p>)}</div>}
          <GenericFlow steps={d.steps} showStatus={false} />
          <div className="kr-banner"><p>En envoyant les invitations, chaque participant reçoit le processus proposé. Il peut l'accepter ou demander une modification. Démonstration : aucun email n'est envoyé, vous agirez en leur nom depuis le projet.</p></div>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => router.push(`/demo/projets/${createProject(d, profile)}`)}>Envoyer les invitations</button>
        </div>
      )}

      <div className="kr-wizard-nav">
        {step > 0 && <button type="button" className="kr-btn kr-btn--outline" onClick={back}>Retour</button>}
        {step < LABELS.length - 1 && <button type="button" className="kr-btn kr-btn--primary" onClick={next}>Continuer</button>}
      </div>
    </>
  );
}
