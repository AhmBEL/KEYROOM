"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminDocuments, Journal } from "@/components/demo/AdminPanels";
import { MandatePanel } from "@/components/demo/MandatePanel";
import { ProcessPanel } from "@/components/demo/ProcessPanel";
import { AcceptView, ApproveView, QuestionFlow, SignView } from "./Flows";
import { Icon, type IconName } from "./Icon";
import { Avatar, Journey, Ring, Sheet, Tile, useToast } from "./ui";
import { Vault } from "./Vault";
import { ROLES, roleShort, templateById } from "@/lib/demo/catalog";
import { adminAgenda, journey, nextTask, progressOf, projectProgress, tasksFor, type Task } from "@/lib/demo/next";
import { isParty, questionsFor, sideOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import { buildMandatePdf, openPdf } from "@/lib/demo/mandate";
import type { Participant, Project, RoleKind } from "@/lib/demo/types";

type Tab = "today" | "people" | "vaults" | "process" | "mandate" | "log" | "vault";
type View = { k: "accept" | "questions" | "sign" | "approve" | "mandate"; stepId?: string } | null;
const TASK_ICON: Record<Task["kind"], IconName> = { accept: "flag", questions: "pencil", docs: "lock", sign: "pencil", approve: "unlock", mandate: "file" };

export function ProjectView2({ id }: { id: string }) {
  const { state, ready, setActor, mutate, completeStep, simulateOthers } = useDemo();
  const toast = useToast();
  const pr = state.projects.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab | null>(null);
  const [view, setView] = useState<View>(null);
  const [invite, setInvite] = useState(false);
  const [np, setNp] = useState<{ name: string; email: string; role: RoleKind }>({ name: "", email: "", role: "search" });
  const [err, setErr] = useState<string | null>(null);
  if (!ready) return null;
  if (!pr) return <div className="kr2-screen"><p className="kr2-help">Ce projet n'existe pas dans cette démonstration.</p><Link href="/demo2/projets" className="kr-link">Retour aux projets</Link></div>;

  const me: Participant = pr.participants.find((p) => p.id === state.actor[id]) ?? pr.participants[0];
  const parties = pr.participants.filter(isParty);
  const name = (p: Participant) => (me.isAdmin || p.id === me.id || pr.revealed.identities ? p.name : !isParty(p) ? (p.isAdmin ? "Administrateur" : "Conseil") : `Partie ${String.fromCharCode(65 + Math.max(0, parties.findIndex((x) => x.id === p.id)))}`);
  const short = (p: Participant) => (p.id === me.id ? "Vous" : /^(Partie |Administrateur|Conseil)/.test(name(p)) ? name(p) : name(p).split(" ")[0]);
  const tasks = tasksFor(pr, me);
  const first = me.name.split(" ")[0];

  const tabs: [Tab, string, IconName][] = me.isAdmin
    ? [["today", "Aujourd'hui", "home"], ["people", "Personnes", "users"], ["vaults", "Coffres", "lock"], ["process", "Parcours", "flag"], ...(pr.options.mandate && parties.some((p) => sideOf(p) === "sale") ? [["mandate", "Mandat", "file"] as [Tab, string, IconName]] : []), ["log", "Journal", "clock"]]
    : [["today", "Aujourd'hui", "home"], ["process", "Parcours", "flag"], ...(isParty(me) ? [["vault", "Mon coffre", "lock"] as [Tab, string, IconName]] : []), ...(pr.options.mandate && sideOf(me) === "sale" && me.mandate ? [["mandate", "Mandat", "file"] as [Tab, string, IconName]] : [])];
  const active: Tab = tab && tabs.some(([k]) => k === tab) ? tab : "today";
  const status = (p: Participant): "ok" | "wait" => (p.isAdmin || tasksFor(pr, p).filter((t) => t.actionable || t.done).every((t) => t.done) ? "ok" : "wait");

  const done = () => { setView(null); window.scrollTo({ top: 0 }); };
  const open = (t: Task) => {
    if (t.kind === "docs") { setTab("vault"); return; }
    setView({ k: t.kind, stepId: t.stepId }); window.scrollTo({ top: 0 });
  };

  // ----- Parcours plein écran : une tâche à la fois
  if (view?.k === "accept") return <AcceptView pr={pr} me={me} onDone={done} onExit={() => setView(null)} />;
  if (view?.k === "questions") return (
    <QuestionFlow questions={questionsFor(pr, me)} initial={me.answers} onExit={() => setView(null)}
      onDone={(a) => { mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, answers: a, submitted: true } : x)) }), { who: me.name, text: "A rempli son questionnaire" }); toast("Réponses envoyées, merci"); done(); }} />
  );
  if (view?.k === "sign") {
    const st = pr.steps.find((s) => s.id === view.stepId)!;
    return <SignView title={st.title} sub={st.sub} saved={me.signature} onExit={() => setView(null)}
      onSign={(png) => { mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, signature: png, signed: { ...x.signed, [st.id]: new Date().toISOString() } } : x)) }), { who: me.name, text: `A signé : ${st.title}` }); toast("Signature enregistrée"); done(); }} />;
  }
  if (view?.k === "approve") {
    const st = pr.steps.find((s) => s.id === view.stepId)!;
    return <ApproveView pr={pr} me={me} step={st} name={name} onExit={() => setView(null)}
      onApprove={() => { mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, approved: { ...x.approved, [st.id]: true } } : x)) }), { who: me.name, text: `A donné son accord : ${st.title}` }); toast("Accord enregistré"); }} />;
  }
  if (view?.k === "mandate") return (
    <SignView title="Mandat de vente" sub="Généré à partir de vos réponses" saved={me.signature} onExit={() => setView(null)}
      onSign={(png) => { mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, signature: png, mandate: { ...x.mandate!, status: "signed", signedBy: x.name, signedAt: new Date().toISOString(), signatureImg: png } } : x)) }), { who: me.name, text: `Mandat signé par ${me.name}` }); toast("Mandat signé"); done(); }} />
  );

  const agenda = adminAgenda(pr);
  const next = nextTask(tasks);
  const waiting = parties.filter((p) => p.id !== me.id && status(p) === "wait");

  return (
    <div className="kr2-screen">
      <Link href="/demo2/projets" className="kr2-back" style={{ width: "fit-content" }}><Icon name="arrow-left" size={20} /><span>Projets</span></Link>
      <div className="kr2-hello">
        <div><h1>{me.isAdmin ? pr.name : `Bonjour ${first}`}</h1><p>{me.isAdmin ? `${templateById(pr.templateId).name} · ${pr.participants.length} personnes` : pr.name}</p></div>
        <Ring value={me.isAdmin ? projectProgress(pr) : progressOf(tasks)} size={64} label={me.isAdmin ? "Avancement du projet" : "Votre avancement"} />
      </div>

      <div className="kr-banner" role="note">
        <div className="kr-field"><label htmlFor="actor">Démonstration : agir en tant que</label>
          <select id="actor" className="kr-input" value={me.id} onChange={(e) => { setActor(pr.id, e.target.value); setTab(null); setView(null); }}>
            {pr.participants.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isAdmin ? " (administrateur)" : ""} · {ROLES[p.role].label}</option>)}
          </select></div>
      </div>

      <div className="kr2-tabs" role="tablist" aria-label="Sections du projet">
        {tabs.map(([k, label, ic]) => <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setTab(k)}><Icon name={ic} size={18} />{label}</button>)}
      </div>

      {active === "today" && !me.isAdmin && (
        <>
          {next ? (
            <div className="kr2-card kr2-card--next">
              <p className="kr2-eyebrow">Votre prochaine action</p>
              <h2>{next.label}</h2>
              {next.hint && <p>{next.hint}</p>}
              <button type="button" className="kr-btn kr-btn--gold" onClick={() => open(next)}>Commencer</button>
            </div>
          ) : (
            <div className="kr2-card">
              <p className="kr2-eyebrow">{tasks.length && tasks.every((t) => t.done) ? "Tout est fait" : "En attente"}</p>
              <h2>Vous avez tout fait pour l'instant</h2>
              <p style={{ color: "var(--text-muted)" }}>{waiting.length ? `Nous attendons ${waiting.map(name).join(", ")}.` : "Le projet avance avec l'administrateur."} Vous serez prévenu dès que votre action sera nécessaire.</p>
            </div>
          )}
          {tasks.length > 0 && <div className="kr2-grid">
            {tasks.filter((t) => t.done || t.actionable).map((t) => (
              <button key={t.id} type="button" className={`kr2-task${t.done ? " is-done" : t === next ? " is-now" : ""}`} disabled={!t.actionable && !t.done} onClick={() => !t.done && t.actionable && open(t)} style={{ opacity: !t.actionable && !t.done ? 0.55 : 1 }}>
                <span className="kr2-task__ico"><Icon name={t.done ? "check" : TASK_ICON[t.kind]} size={18} /></span>
                <span className="kr2-task__txt">{t.label}<span>{t.done ? "Terminé" : t.actionable ? t.hint : "Bientôt, quand l'étape sera en cours"}</span></span>
                {!t.done && t.actionable && <Icon name="chevron" size={18} />}
              </button>
            ))}
            {tasks.some((t) => !t.done && !t.actionable) && (
              <details className="kr-details"><summary>À venir ({tasks.filter((t) => !t.done && !t.actionable).length})</summary>
                <ul className="kr-list">{tasks.filter((t) => !t.done && !t.actionable).map((t) => <li key={t.id}><strong>{t.label}</strong><span className="kr-small">Quand l'étape sera en cours</span></li>)}</ul>
              </details>
            )}
          </div>}
        </>
      )}

      {active === "today" && me.isAdmin && (
        <>
          {agenda.openChanges > 0 ? (
            <div className="kr2-card kr2-card--next"><p className="kr2-eyebrow">Votre prochaine action</p><h2>{agenda.openChanges} demande{agenda.openChanges > 1 ? "s" : ""} de modification</h2><p>Un participant souhaite adapter le processus.</p><button type="button" className="kr-btn kr-btn--gold" onClick={() => setTab("process")}>Voir les demandes</button></div>
          ) : agenda.pending.length > 0 ? (
            <div className="kr2-card kr2-card--next"><p className="kr2-eyebrow">En attente</p><h2>{agenda.pending.map((p) => p.name.split(" ")[0]).join(", ")} n'{agenda.pending.length > 1 ? "ont" : "a"} pas encore accepté</h2><p>Le processus leur a été proposé.</p>
              <button type="button" className="kr-btn kr-btn--gold" onClick={() => { for (const p of agenda.pending) mutate(pr.id, (x) => x, { who: me.name, text: `Rappel envoyé à ${p.name}` }); toast("Rappel envoyé"); }}>Relancer</button></div>
          ) : agenda.current.length === 0 ? (
            <div className="kr2-reveal"><span className="kr2-reveal__ico"><Icon name="flag" size={30} /></span><h2 className="kr-title-3" style={{ margin: 0 }}>Processus terminé</h2><p>La transaction peut passer au contrat de vente ou chez le notaire.</p></div>
          ) : agenda.current.map(({ step, ok, missing }) => (
            <div key={step.id} className={`kr2-card${ok ? " kr2-card--next" : ""}`}>
              <p className="kr2-eyebrow">{ok ? "Prêt à valider" : "Étape en cours"}</p><h2>{step.title}</h2><p style={ok ? undefined : { color: "var(--text-muted)" }}>{step.sub}</p>
              {!ok && missing.length > 0 && <ul className="kr-list">{missing.map((m) => <li key={m}><span className="kr-small">{m}</span></li>)}</ul>}
              {step.reveals.length > 0 && <p style={{ fontSize: 14 }}><Icon name="unlock" size={14} /> Révèle {step.reveals.map((r) => (r === "documents" ? "les documents" : "les identités")).join(" et ")}</p>}
              {ok ? <button type="button" className="kr-btn kr-btn--gold" onClick={() => { completeStep(pr.id, step.id, false); toast(step.reveals.length ? `Étape validée, ${step.reveals.map((r) => (r === "documents" ? "documents révélés" : "identités révélées")).join(" et ")}` : "Étape validée"); }}>Valider cette étape</button> : (
                <>
                  <button type="button" className="kr-btn kr-btn--outline" onClick={() => { mutate(pr.id, (x) => x, { who: me.name, text: `Rappel envoyé pour : ${step.title}` }); toast("Rappel envoyé aux personnes concernées"); }}>Relancer les personnes concernées</button>
                  <button type="button" className="kr-link" onClick={() => { if (window.confirm("Valider malgré les éléments manquants ? Cette décision d'arbitrage sera inscrite au journal.")) completeStep(pr.id, step.id, true); }}>Valider malgré tout (arbitrage)</button>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {active === "today" && (
        <>
          <div className="kr2-card">
            <div className="kr2-between"><p className="kr2-eyebrow">Le parcours</p><span style={{ fontSize: 13, color: "var(--text-muted)" }}>{journey(pr).filter((g) => g.done).length} / {journey(pr).length}</span></div>
            <Journey groups={journey(pr)} />
            <p style={{ fontSize: 15 }}>{journey(pr).find((g) => g.current)?.label ?? "Toutes les étapes sont terminées"}</p>
          </div>
          <div className="kr2-card">
            <p className="kr2-eyebrow">Les personnes</p>
            <div className="kr2-people">{pr.participants.map((p) => <span key={p.id} className="kr2-person"><Avatar name={name(p)} status={status(p)} size={48} />{short(p)}<span style={{ color: "var(--text-muted)" }}>{me.isAdmin || pr.revealed.identities || p.id === me.id ? roleShort(p.role) : ""}</span></span>)}</div>
            {!me.isAdmin && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Vous voyez seulement si chacun a terminé, jamais le contenu.</p>}
          </div>
          {me.isAdmin && <details className="kr-details"><summary>Outils de démonstration</summary><p className="kr-small">Remplit à la place des autres participants : acceptation, questionnaire, documents, signatures et accords.</p><button type="button" className="kr-btn kr-btn--outline" onClick={() => { simulateOthers(pr.id); toast("Les autres participants ont tout rempli"); }}>Simuler les autres participants</button></details>}
        </>
      )}

      {active === "people" && (
        <div className="kr2-grid">
          {pr.participants.map((p) => (
            <div key={p.id} className="kr2-card" style={{ padding: "var(--space-4)" }}>
              <div className="kr2-row"><Avatar name={p.name} status={status(p)} size={48} /><div style={{ flex: 1 }}><strong style={{ color: "var(--ink)" }}>{p.name}{p.isAdmin ? " (vous)" : ""}</strong><p style={{ fontSize: 14, color: "var(--text-muted)" }}>{ROLES[p.role].label}</p></div></div>
              <div className="kr2-row kr2-row--wrap">
                {!p.isAdmin && <span className={`kr2-chip ${p.accepted === "accepted" ? "kr2-chip--ok" : "kr2-chip--wait"}`}>{p.accepted === "accepted" ? "Processus accepté" : p.accepted === "changes" ? "Modifications demandées" : "Invitation envoyée"}</span>}
                {isParty(p) && <span className={`kr2-chip ${tasksFor(pr, p).filter((t) => t.kind === "docs").every((t) => t.done) ? "kr2-chip--ok" : ""}`}>Coffre {tasksFor(pr, p).filter((t) => t.kind === "docs").every((t) => t.done) ? "complet" : "incomplet"}</span>}
              </div>
              {p.id !== me.id && <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => { setActor(pr.id, p.id); setTab(null); }}>Agir en tant que {p.name.split(" ")[0]}</button>}
            </div>
          ))}
          <Tile icon="plus" title="Inviter une personne" text="Vente, recherche, notaire, autre…" onClick={() => { setNp({ name: "", email: "", role: "search" }); setErr(null); setInvite(true); }} />
          <Sheet open={invite} onClose={() => setInvite(false)} title="Inviter une personne">
            <form className="kr2-grid" noValidate onSubmit={(e) => {
              e.preventDefault();
              if (!np.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(np.email.trim())) return setErr("Indiquez un nom et une adresse email valide.");
              mutate(pr.id, (p) => ({ ...p, participants: [...p.participants, { id: `p${Date.now().toString(36)}`, name: np.name.trim(), email: np.email.trim(), role: np.role, isAdmin: false, accepted: "pending", answers: {}, submitted: false, docs: {}, signed: {}, approved: {} }] }), { who: me.name, text: `Invitation envoyée à ${np.name.trim()} (${ROLES[np.role].label})` });
              toast(`Invitation envoyée à ${np.name.trim()}`); setInvite(false);
            }}>
              <input className="kr2-input" placeholder="Nom" aria-label="Nom" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
              <input className="kr2-input" type="email" placeholder="Email" aria-label="Email" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} />
              {(["sale", "search", "legal", "agent", "other"] as RoleKind[]).map((r) => <Tile key={r} title={ROLES[r].label} selected={np.role === r} onClick={() => setNp({ ...np, role: r })} />)}
              {err && <p className="kr-error" role="alert">{err}</p>}
              <button type="submit" className="kr-btn kr-btn--primary">Envoyer l'invitation</button>
            </form>
          </Sheet>
        </div>
      )}

      {active === "vaults" && <AdminDocuments pr={pr} me={me} />}
      {active === "vault" && <Vault pr={pr} me={me} name={name} />}
      {active === "process" && <ProcessPanel pr={pr} me={me} name={name} />}
      {active === "log" && <Journal pr={pr} />}
      {active === "mandate" && (me.isAdmin ? <MandatePanel pr={pr} me={me} /> : <MandateView2 pr={pr} me={me} onSign={() => setView({ k: "mandate" })} />)}
    </div>
  );
}

function MandateView2({ pr, me, onSign }: { pr: Project; me: Participant; onSign: () => void }) {
  const m = me.mandate; const admin = pr.participants.find((p) => p.isAdmin)!;
  if (!m) return <div className="kr2-card"><p>Le mandat sera généré par votre agent à partir de vos réponses.</p></div>;
  return (
    <div className="kr2-card">
      <p className="kr2-eyebrow">Mandat de vente</p>
      <h2>{m.status === "draft" ? "En préparation" : m.status === "validated" ? "Prêt à signer" : m.status === "signed" ? "Signé" : "Signé et envoyé"}</h2>
      <button type="button" className="kr-btn kr-btn--outline" onClick={async () => openPdf(await buildMandatePdf(pr, me, admin, m.signedBy ? { by: m.signedBy, at: m.signedAt ?? new Date().toISOString(), image: m.signatureImg } : undefined))}>Ouvrir le mandat (PDF)</button>
      {m.status === "validated" && <button type="button" className="kr-btn kr-btn--primary" onClick={onSign}>Signer le mandat</button>}
      {m.signedAt && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Signé le {new Date(m.signedAt).toLocaleString("fr-FR")}</p>}
    </div>
  );
}
