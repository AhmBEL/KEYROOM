"use client";

import { FieldForm } from "./FieldForm";
import { ROLES } from "@/lib/demo/catalog";
import { docProgress, docsFor, enabledSteps, formDone, isParty, questionsFor, sideOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project } from "@/lib/demo/types";

type Tab = "todo" | "process" | "docs" | "mandate";

export function Todo({ pr, me, name, goto }: { pr: Project; me: Participant; name: (p: Participant) => string; goto: (t: Tab) => void }) {
  const { mutate } = useDemo();
  const party = isParty(me);
  const qs = questionsFor(pr, me);
  const dp = docProgress(pr, me);
  const cur = enabledSteps(pr).filter((s) => s.status === "current" && (!s.side || s.side === sideOf(me)));
  const sign = party ? cur.filter((s) => s.requires.includes("agreement") && !me.signed[s.id]) : [];
  const approve = party && pr.options.revealRule === "both" ? cur.filter((s) => s.requires.includes("approval") && !me.approved[s.id]) : [];
  const mandateToSign = me.mandate?.status === "validated";
  const needAccept = me.accepted !== "accepted" && !me.isAdmin;
  const others = pr.participants.filter((p) => p.id !== me.id && isParty(p));
  const nothing = !needAccept && !(party && qs.length && !me.submitted) && !(party && !dp.complete) && !sign.length && !approve.length && !mandateToSign;

  return (
    <div className="kr-grid">
      <section className="kr-todo"><h2 className="kr-eyebrow">À faire maintenant</h2>
        {nothing && <p className="kr-body">Rien à faire pour le moment. Vous serez prévenu dès que le projet avance.</p>}
        {needAccept && <><p className="kr-body">Lisez le processus proposé, puis acceptez-le ou demandez une modification.</p><button type="button" className="kr-btn kr-btn--primary" onClick={() => goto("process")}>Voir le processus</button></>}
        {sign.map((s) => (
          <div key={s.id} className="kr-grid"><p className="kr-body">Signature demandée : <strong>{s.title}</strong>. {s.sub}.</p>
            <button type="button" className="kr-btn kr-btn--primary" onClick={() => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, signed: { ...x.signed, [s.id]: new Date().toISOString() } } : x)) }), { who: me.name, text: `A signé : ${s.title}` })}>Signer (simulation)</button></div>
        ))}
        {approve.map((s) => (
          <div key={s.id} className="kr-grid"><p className="kr-body">Donnez votre accord pour l'étape <strong>{s.title}</strong>{s.reveals.length ? ` : elle révèle ${s.reveals.map((x) => (x === "documents" ? "les documents des parties" : "les identités")).join(" et ")}` : ""}.</p>
            <button type="button" className="kr-btn kr-btn--primary" onClick={() => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, approved: { ...x.approved, [s.id]: true } } : x)) }), { who: me.name, text: `A donné son accord : ${s.title}` })}>Donner mon accord</button></div>
        ))}
        {mandateToSign && <><p className="kr-body">Votre mandat est prêt à être signé.</p><button type="button" className="kr-btn kr-btn--primary" onClick={() => goto("mandate")}>Voir le mandat</button></>}
        {party && !dp.complete && <><p className="kr-body">Déposez vos documents : {dp.done} sur {dp.total} obligatoires.</p><button type="button" className="kr-btn kr-btn--primary" onClick={() => goto("docs")}>Déposer mes documents</button></>}
      </section>

      {party && qs.length > 0 && (
        <section className="kr-card"><p className="kr-card__ref">Questionnaire</p>
          {me.submitted ? <p className="kr-success" role="status">Vos réponses sont enregistrées.</p> : (
            <><h3 className="kr-title-3">Vos informations</h3>
              <FieldForm questions={qs} initial={me.answers} onSubmit={(a) => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, answers: a, submitted: true } : x)) }), { who: me.name, text: "A rempli son questionnaire" })} /></>
          )}
        </section>
      )}

      <section className="kr-card"><p className="kr-card__ref">Avancement des autres parties</p>
        <p className="kr-small">Vous voyez seulement si chacun a terminé. Le contenu reste privé jusqu'à l'étape qui le révèle.</p>
        <ul className="kr-list">{others.map((p) => { const d = docProgress(pr, p); return (
          <li key={p.id}><strong>{name(p)}</strong>
            <div className="kr-row"><span className={`kr-pill ${formDone(pr, p) ? "kr-pill--ok" : "kr-pill--muted"}`}>{formDone(pr, p) ? "Questionnaire fait" : "Questionnaire à faire"}</span><span className={`kr-pill ${d.complete ? "kr-pill--ok" : "kr-pill--muted"}`}>{d.complete ? "Documents complets" : "Documents incomplets"}</span></div></li>
        ); })}{others.length === 0 && <li><span className="kr-small">Aucune autre partie.</span></li>}</ul>
      </section>
    </div>
  );
}

export function MyDocs({ pr, me, name }: { pr: Project; me: Participant; name: (p: Participant) => string }) {
  const { mutate } = useDemo();
  const list = docsFor(pr, me); const dp = docProgress(pr, me);
  const others = pr.participants.filter((p) => p.id !== me.id && isParty(p));
  return (
    <div className="kr-grid">
      <div className="kr-banner"><p>Vos documents sont privés : personne ne peut les consulter avant l'étape prévue, ni même savoir lesquels vous avez déposés. Chacun voit seulement si votre dossier est complet.</p><p>Démonstration : seul le nom du fichier est conservé.</p></div>
      <p className="kr-small">Obligatoires : {dp.done} sur {dp.total} déposés.</p>
      {list.length === 0 && <div className="kr-banner"><p>Aucun document n'est demandé pour votre rôle.</p></div>}
      {list.map((d) => {
        const f = me.docs[d.id];
        return (
          <section key={d.id} className="kr-card"><p className="kr-card__ref">{d.required ? "Obligatoire" : "Facultatif"}</p><h3 className="kr-title-3">{d.label}</h3>
            <p className="kr-small">Visible par : vous{d.adminAccess ? " et l'administrateur" : " seul"}.</p>
            {f ? <><p className="kr-success" role="status">Déposé : {f.name}</p>
              <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => { if (x.id !== me.id) return x; const { [d.id]: _, ...rest } = x.docs; return { ...x, docs: rest }; }) }), { who: me.name, text: `A retiré un document : ${d.label}` })}>Retirer</button></> : (
              <div className="kr-field"><label htmlFor={`up-${d.id}`} className="kr-sr">Choisir un fichier pour {d.label}</label>
                <input id={`up-${d.id}`} type="file" className="kr-input kr-file" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, docs: { ...x.docs, [d.id]: { name: file.name, size: file.size, at: new Date().toISOString() } } } : x)) }), { who: me.name, text: `A déposé un document : ${d.label}` }); }} />
                <p className="kr-hint">PDF, image ou document. Vérification automatique du document : <span className="kr-soon">Bientôt disponible</span></p></div>
            )}
          </section>
        );
      })}
      <h3 className="kr-title-3">Documents des autres parties</h3>
      {!pr.revealed.documents ? <div className="kr-banner"><p>Ils ne sont pas encore révélés. Ils le seront à l'étape prévue, avec l'accord des parties.</p></div> : (
        others.map((p) => <section key={p.id} className="kr-card"><p className="kr-card__ref">{ROLES[p.role].label}</p><h3 className="kr-title-3">{name(p)}</h3>
          <div>{docsFor(pr, p).map((d) => <div key={d.id} className="kr-doc-line"><span>{d.label}</span><span className={`kr-pill ${p.docs[d.id] ? "kr-pill--ok" : "kr-pill--muted"}`}>{p.docs[d.id]?.name ?? "Non déposé"}</span></div>)}</div></section>)
      )}
    </div>
  );
}
