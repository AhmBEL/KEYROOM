"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminDocuments, Journal, Overview, Participants } from "./AdminPanels";
import { MandatePanel } from "./MandatePanel";
import { MyDocs, Todo } from "./ParticipantPanels";
import { ProcessPanel } from "./ProcessPanel";
import { ROLES, templateById } from "@/lib/demo/catalog";
import { isParty, sideOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant } from "@/lib/demo/types";

type Tab = "overview" | "participants" | "documents" | "process" | "mandate" | "log" | "todo" | "docs";

export function ProjectView({ id }: { id: string }) {
  const { state, ready, setActor } = useDemo();
  const pr = state.projects.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab | null>(null);
  if (!ready) return null;
  if (!pr) return <><p className="kr-body">Ce projet n'existe pas dans cette démonstration.</p><Link href="/demo/projets" className="kr-link">Retour à mes projets</Link></>;

  const me: Participant = pr.participants.find((p) => p.id === state.actor[id]) ?? pr.participants[0];
  const parties = pr.participants.filter(isParty);
  // Identités : l'administrateur et soi-même voient tout ; les autres voient « Partie A » jusqu'à la révélation.
  const name = (p: Participant) => (me.isAdmin || p.id === me.id || pr.revealed.identities ? p.name : `Partie ${String.fromCharCode(65 + Math.max(0, parties.findIndex((x) => x.id === p.id)))} (${sideOf(p) === "sale" ? "côté vente" : "côté recherche"})`);

  const owner = me.isAdmin ? parties.some((p) => sideOf(p) === "sale") : sideOf(me) === "sale";
  const tabs: [Tab, string][] = me.isAdmin
    ? [["overview", "Vue d'ensemble"], ["participants", "Participants"], ["documents", "Documents"], ["process", "Processus"], ...(pr.options.mandate && owner ? [["mandate", "Mandat"] as [Tab, string]] : []), ["log", "Journal"]]
    : [["todo", "Mon espace"], ["process", "Processus"], ...(isParty(me) ? [["docs", "Mes documents"] as [Tab, string]] : []), ...(pr.options.mandate && sideOf(me) === "sale" ? [["mandate", "Mandat"] as [Tab, string]] : [])];
  const active: Tab = tab && tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <>
      <Link href="/demo/projets" className="kr-link">← Mes projets</Link>
      <p className="kr-card__ref kr-ref-line" style={{ marginTop: "var(--space-3)" }}>{templateById(pr.templateId).name}</p>
      <h1 className="kr-title-2">{pr.name}</h1>

      <div className="kr-banner" role="note">
        <div className="kr-field"><label htmlFor="actor">Démonstration : agir en tant que</label>
          <select id="actor" className="kr-input" value={me.id} onChange={(e) => { setActor(pr.id, e.target.value); setTab(null); }}>
            {pr.participants.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isAdmin ? " (administrateur)" : ""} · {ROLES[p.role].label}</option>)}
          </select></div>
        <p className="kr-small" style={{ marginTop: "var(--space-2)" }}>{me.isAdmin ? "Vous voyez le projet comme son administrateur." : `Vous voyez le projet comme ${me.name} : seules ses informations et l'état d'avancement des autres sont visibles.`}</p>
      </div>

      <div className="kr-tabs" role="tablist" aria-label="Sections du projet">
        {tabs.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {active === "overview" && <Overview pr={pr} me={me} name={name} />}
      {active === "participants" && <Participants pr={pr} me={me} name={name} />}
      {active === "documents" && <AdminDocuments pr={pr} me={me} />}
      {active === "process" && <ProcessPanel pr={pr} me={me} name={name} />}
      {active === "mandate" && <MandatePanel pr={pr} me={me} />}
      {active === "log" && <Journal pr={pr} />}
      {active === "todo" && <Todo pr={pr} me={me} name={name} goto={(t) => setTab(t as Tab)} />}
      {active === "docs" && <MyDocs pr={pr} me={me} name={name} />}
    </>
  );
}
