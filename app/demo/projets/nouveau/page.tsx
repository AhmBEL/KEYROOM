"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GenericFlow } from "@/components/demo/GenericFlow";
import { DocsEditor, ProcessEditor, QuestionsEditor } from "@/components/demo/editors";
import { PROFILES, ROLES, TEMPLATES, templateById } from "@/lib/demo/catalog";
import { checkProcess } from "@/lib/demo/rules";
import { draftFromTemplate, useDemo, type Draft } from "@/lib/demo/store";
import type { Project, RoleKind } from "@/lib/demo/types";

const LABELS = ["Modèle", "Votre rôle", "Participants", "Informations", "Documents", "Processus", "Invitations"];
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
          <QuestionsEditor d={d} upd={upd} />
        </div>
      )}

      {step === 4 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Quels documents demander ?</h1>
          <p className="kr-body">Chacun dépose ses documents dans son espace privé. L'« accès administrateur » permet à l'administrateur de les consulter ; sans cette case, il ne voit que l'état d'avancement.</p>
          <DocsEditor d={d} upd={upd} />
        </div>
      )}

      {step === 5 && (
        <div className="kr-form">
          <h1 className="kr-title-2">Le processus</h1>
          <p className="kr-body">Voici le processus proposé. Les participants pourront l'accepter ou demander des modifications. Choisissez une version, puis ajustez.</p>
          <ProcessEditor d={d} setD={setD} upd={upd} warnings={warnings} />
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
