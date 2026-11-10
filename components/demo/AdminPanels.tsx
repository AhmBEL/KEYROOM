"use client";

import { useState } from "react";
import { GenericFlow } from "./GenericFlow";
import { REQ_LABEL, ROLES } from "@/lib/demo/catalog";
import { docProgress, docsFor, enabledSteps, formDone, isParty, questionsFor, stepReady } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project, RoleKind } from "@/lib/demo/types";

const ACC = { pending: "Invitation envoyée", accepted: "Processus accepté", changes: "Modifications demandées" } as const;

export function Overview({ pr, me, name }: { pr: Project; me: Participant; name: (p: Participant) => string }) {
  const { completeStep, simulateOthers } = useDemo();
  const [msg, setMsg] = useState<string | null>(null);
  const current = enabledSteps(pr).filter((x) => x.status === "current");
  const open = pr.changes.filter((c) => c.status === "open").length;
  const pending = pr.participants.filter((p) => !p.isAdmin && p.accepted !== "accepted").length;

  return (
    <div className="kr-grid">
      {(open > 0 || pending > 0) && (
        <div className="kr-banner kr-banner--warn" role="note">
          {pending > 0 && <p>{pending} participant{pending > 1 ? "s" : ""} n'{pending > 1 ? "ont" : "a"} pas encore accepté le processus.</p>}
          {open > 0 && <p>{open} demande{open > 1 ? "s" : ""} de modification en attente (onglet Processus).</p>}
        </div>
      )}
      <GenericFlow steps={pr.steps} />
      {current.length === 0 && enabledSteps(pr).length > 0 && <div className="kr-banner"><p>Toutes les étapes sont terminées. La transaction peut passer au contrat de vente ou chez le notaire.</p></div>}
      {current.map((st) => {
        const r = stepReady(pr, st);
        return (
          <section key={st.id} className="kr-card">
            <p className="kr-card__ref">Étape en cours</p><h3 className="kr-title-3">{st.title}</h3><p className="kr-small">{st.sub}</p>
            {st.requires.length > 0 ? <p className="kr-small">Pour valider : {st.requires.map((x) => REQ_LABEL[x]).join(", ")}.</p> : <p className="kr-small">Aucun prérequis : vous pouvez valider quand vous êtes prêt.</p>}
            {r.missing.length > 0 && <ul className="kr-list">{r.missing.map((m) => <li key={m}><span className="kr-small">{m}</span></li>)}</ul>}
            {st.reveals.length > 0 && <p className="kr-small">Cette étape révèle : {st.reveals.map((x) => (x === "documents" ? "les documents des parties" : "les identités")).join(" et ")}.</p>}
            <button type="button" className="kr-btn kr-btn--primary" disabled={!r.ok} onClick={() => completeStep(pr.id, st.id, false)}>Valider cette étape</button>
            {!r.ok && <button type="button" className="kr-btn kr-btn--outline" onClick={() => { if (window.confirm("Valider malgré les éléments manquants ? Cette décision d'arbitrage sera inscrite au journal.")) completeStep(pr.id, st.id, true); }}>Valider malgré tout (arbitrage)</button>}
          </section>
        );
      })}
      <section className="kr-card">
        <p className="kr-card__ref">Outil de démonstration</p>
        <p className="kr-small">Remplit à la place des autres participants : acceptation, questionnaire, documents, signatures et accords.</p>
        <button type="button" className="kr-btn kr-btn--outline" onClick={() => { simulateOthers(pr.id); setMsg("Les autres participants ont tout rempli, déposé, signé et approuvé."); }}>Simuler les autres participants</button>
        {msg && <p className="kr-success" role="status">Terminé : {msg}</p>}
      </section>
      <p className="kr-hint">Connecté en tant que {name(me)}.</p>
    </div>
  );
}

export function Participants({ pr, me, name }: { pr: Project; me: Participant; name: (p: Participant) => string }) {
  const { mutate, setActor } = useDemo();
  const [n, setN] = useState(""); const [e, setE] = useState(""); const [r, setR] = useState<RoleKind>("sale"); const [err, setErr] = useState<string | null>(null);
  return (
    <div className="kr-grid">
      <ul className="kr-list">
        {pr.participants.map((p) => {
          const dp = docProgress(pr, p);
          return (
            <li key={p.id}>
              <strong>{name(p)}{p.isAdmin ? " (administrateur)" : ""}</strong>
              <span className="kr-small">{ROLES[p.role].label} · {p.email || "adresse non renseignée"}</span>
              <div className="kr-row">
                <span className="kr-pill">{p.isAdmin ? "Administrateur" : ACC[p.accepted]}</span>
                {isParty(p) && <span className={`kr-pill ${formDone(pr, p) ? "kr-pill--ok" : "kr-pill--muted"}`}>{questionsFor(pr, p).length ? (p.submitted ? "Questionnaire reçu" : "Questionnaire à faire") : "Pas de questionnaire"}</span>}
                {isParty(p) && dp.total > 0 && <span className={`kr-pill ${dp.complete ? "kr-pill--ok" : "kr-pill--muted"}`}>Documents {dp.done}/{dp.total}</span>}
              </div>
              {p.id !== me.id && <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => setActor(pr.id, p.id)}>Agir en tant que {p.name.split(" ")[0]}</button>}
            </li>
          );
        })}
      </ul>
      <form className="kr-form" onSubmit={(ev) => {
        ev.preventDefault();
        if (!n.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) return setErr("Indiquez un nom et une adresse email valide.");
        setErr(null);
        mutate(pr.id, (p) => ({ ...p, participants: [...p.participants, { id: `p${Date.now().toString(36)}`, name: n.trim(), email: e.trim(), role: r, isAdmin: false, accepted: "pending", answers: {}, submitted: false, docs: {}, signed: {}, approved: {} }] }), { who: me.name, text: `Invitation envoyée à ${n.trim()} (${ROLES[r].label})` });
        setN(""); setE("");
      }}>
        <h3 className="kr-title-3">Inviter un participant</h3>
        <div className="kr-field"><label htmlFor="an">Nom</label><input id="an" className="kr-input" value={n} onChange={(x) => setN(x.target.value)} /></div>
        <div className="kr-field"><label htmlFor="ae">Email</label><input id="ae" type="email" className="kr-input" value={e} onChange={(x) => setE(x.target.value)} /></div>
        <div className="kr-field"><label htmlFor="ar">Rôle</label><select id="ar" className="kr-input" value={r} onChange={(x) => setR(x.target.value as RoleKind)}>{(Object.keys(ROLES) as RoleKind[]).map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}</select></div>
        {err && <p className="kr-error" role="alert">{err}</p>}
        <button type="submit" className="kr-btn kr-btn--outline">Envoyer l'invitation</button>
      </form>
    </div>
  );
}

// Matrice des documents : l'administrateur voit l'état de chacun, et le contenu seulement là où l'accès lui est donné.
export function AdminDocuments({ pr, me }: { pr: Project; me: Participant }) {
  return (
    <div className="kr-grid">
      <div className="kr-banner"><p>Vous voyez l'état d'avancement de chacun. Le nom du fichier n'est affiché que pour les documents marqués « accès administrateur » ou déposés par vous.</p>
        <p>Documents révélés aux parties : <strong>{pr.revealed.documents ? "oui" : "pas encore"}</strong>.</p></div>
      {pr.participants.filter(isParty).map((p) => {
        const list = docsFor(pr, p); const dp = docProgress(pr, p);
        return (
          <section key={p.id} className="kr-card">
            <p className="kr-card__ref">{ROLES[p.role].label}</p><h3 className="kr-title-3">{p.name}</h3>
            <p className="kr-small">{dp.complete ? "Tous les documents obligatoires sont déposés." : `Documents obligatoires : ${dp.done} sur ${dp.total}.`}</p>
            <div>{list.map((d) => {
              const f = p.docs[d.id]; const visible = d.adminAccess || p.id === me.id;
              return (
                <div key={d.id} className="kr-doc-line"><span>{d.label}{d.required ? "" : " (facultatif)"}</span>
                  <span className={`kr-pill ${f ? "kr-pill--ok" : "kr-pill--muted"}`}>{f ? (visible ? f.name : "Déposé · contenu privé") : "Manquant"}</span></div>
              );
            })}{list.length === 0 && <p className="kr-small">Aucun document demandé.</p>}</div>
          </section>
        );
      })}
    </div>
  );
}

export function Journal({ pr }: { pr: Project }) {
  return (
    <ul className="kr-log">
      {[...pr.log].reverse().map((l, i) => (
        <li key={i}><span>{l.text}</span><span className="kr-small">{l.who} · {new Date(l.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span></li>
      ))}
    </ul>
  );
}
