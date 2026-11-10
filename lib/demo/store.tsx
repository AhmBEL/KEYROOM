"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PROFILES, ROLES, templateById } from "./catalog";
import { docsFor, questionsFor, refreshStatus, stepReady } from "./rules";
import type { DemoState, DocReq, Participant, Profile, Project, Question, RoleKind, Step } from "./types";

const KEY = "kr-demo-v1";
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();
const EMPTY: DemoState = { profile: null, projects: [], actor: {} };

export const emptyProfile = (): Profile => ({ kind: null, firstName: "", lastName: "", email: "", via: "email", company: "", country: "", address: "", phone: "", saved: false, onboarded: false });

export type Draft = {
  name: string; templateId: string; myRole: RoleKind; adminIsParty: boolean;
  participants: { name: string; email: string; role: RoleKind }[];
  steps: Step[]; docReqs: DocReq[]; questions: Question[]; options: Project["options"];
};

export function draftFromTemplate(templateId: string, myRole: RoleKind): Draft {
  const t = templateById(templateId);
  return {
    name: "", templateId, myRole, adminIsParty: false, participants: [],
    steps: refreshStatus(t.steps.map((x) => ({ ...x, enabled: true, status: "upcoming" as const }))),
    docReqs: t.docs.map((x) => ({ ...x, enabled: true })),
    questions: t.questions.map((x) => ({ ...x, enabled: true })),
    options: { revealRule: "both", mandate: t.mandate, preset: "custom" },
  };
}

type Api = {
  ready: boolean; state: DemoState;
  setProfile: (p: Profile | null) => void; patchProfile: (patch: Partial<Profile>) => void; resetDemo: () => void;
  createProject: (d: Draft, profile: Profile) => string; seedExample: (profile: Profile) => string;
  mutate: (projectId: string, fn: (p: Project) => Project, log?: { who: string; text: string }) => void;
  setActor: (projectId: string, participantId: string) => void;
  completeStep: (projectId: string, stepId: string, force: boolean) => { ok: boolean; missing: string[] };
  simulateOthers: (projectId: string) => void;
};
const Ctx = createContext<Api | null>(null);
export const useDemo = () => { const c = useContext(Ctx); if (!c) throw new Error("DemoProvider manquant"); return c; };

const entry = (who: string, text: string) => ({ at: now(), who, text });

function buildProject(d: Draft, profile: Profile): Project {
  const admin: Participant = {
    id: uid(), name: `${profile.firstName} ${profile.lastName}`.trim() || "Moi", email: profile.email, role: d.myRole, isAdmin: true,
    accepted: "accepted", answers: {}, submitted: false, docs: {}, signed: {}, approved: {},
  };
  const others: Participant[] = d.participants.filter((p) => p.name.trim()).map((p) => ({
    id: uid(), name: p.name.trim(), email: p.email.trim(), role: p.role, isAdmin: false,
    accepted: "pending", answers: {}, submitted: false, docs: {}, signed: {}, approved: {},
  }));
  return {
    id: uid(), name: d.name.trim() || templateById(d.templateId).name, templateId: d.templateId, createdAt: now(), adminId: admin.id,
    participants: [admin, ...others], steps: refreshStatus(d.steps), docReqs: d.docReqs, questions: d.questions, options: d.options,
    revealed: { documents: false, identities: false }, changes: [], invited: true,
    log: [entry(admin.name, "Projet créé"), ...others.map((o) => entry(admin.name, `Invitation envoyée à ${o.name} (${ROLES[o.role].label})`))],
  };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(EMPTY);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setState({ ...EMPTY, ...JSON.parse(raw) }); } catch { /* démarrage à vide */ }
    loaded.current = true; setReady(true);
  }, []);
  useEffect(() => { if (loaded.current) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sans mémoire */ } } }, [state]);

  const mutate = useCallback<Api["mutate"]>((projectId, fn, log) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === projectId ? (() => { const n = fn(p); return log ? { ...n, log: [...n.log, entry(log.who, log.text)] } : n; })() : p)) }));
  }, []);

  const api = useMemo<Api>(() => ({
    ready, state,
    setProfile: (profile) => setState((s) => ({ ...s, profile })),
    patchProfile: (patch) => setState((s) => ({ ...s, profile: { ...(s.profile ?? emptyProfile()), ...patch } })),
    resetDemo: () => { setState(EMPTY); try { localStorage.removeItem(KEY); } catch { /* rien */ } },
    createProject: (d, profile) => {
      const p = buildProject(d, profile);
      setState((s) => ({ ...s, projects: [p, ...s.projects], actor: { ...s.actor, [p.id]: p.adminId } }));
      return p.id;
    },
    seedExample: (profile) => {
      const d = draftFromTemplate("grosse", profile.kind ? (PROFILES.find((x) => x.kind === profile.kind)?.role ?? "introducer") : "introducer");
      d.name = "Hôtel 5 étoiles, océan Indien (exemple)";
      d.participants = [{ name: "Marie Laurent", email: "marie@exemple.test", role: "sale" }, { name: "Yann Moreau", email: "yann@exemple.test", role: "search" }];
      d.myRole = "introducer";
      const p = buildProject(d, profile);
      // Un projet déjà entamé : Marie a accepté et répondu, Yann a accepté.
      const marie = p.participants[1], yann = p.participants[2];
      marie.accepted = "accepted"; yann.accepted = "accepted";
      marie.submitted = true; marie.answers = { sq1: "Hôtel 5 étoiles, 80 chambres", sq2: "Maurice, côte nord", sq4: PRICE_EX, sq5: "Oui" };
      marie.docs = { v1: { name: "mandat-signé.pdf", size: 184000, at: now() }, v2: { name: "titre-propriété.pdf", size: 912000, at: now() } };
      p.log.push(entry(marie.name, "A accepté le processus"), entry(yann.name, "A accepté le processus"), entry(marie.name, "A rempli son questionnaire"));
      setState((s) => ({ ...s, projects: [p, ...s.projects], actor: { ...s.actor, [p.id]: p.adminId } }));
      return p.id;
    },
    mutate,
    setActor: (projectId, participantId) => setState((s) => ({ ...s, actor: { ...s.actor, [projectId]: participantId } })),
    completeStep: (projectId, stepId, force) => {
      const pr = state.projects.find((x) => x.id === projectId); const st = pr?.steps.find((x) => x.id === stepId);
      if (!pr || !st) return { ok: false, missing: [] };
      const r = stepReady(pr, st);
      if (!r.ok && !force) return r;
      mutate(projectId, (p) => {
        const steps = refreshStatus(p.steps.map((x) => (x.id === stepId ? { ...x, status: "done" as const } : x)));
        return { ...p, steps, revealed: { documents: p.revealed.documents || st.reveals.includes("documents"), identities: p.revealed.identities || st.reveals.includes("identities") } };
      }, { who: pr.participants.find((x) => x.isAdmin)?.name ?? "Administrateur", text: `Étape validée : ${st.title}${r.ok ? "" : " (arbitrage de l'administrateur)"}${st.reveals.length ? ` — révélation : ${st.reveals.map((x) => (x === "documents" ? "documents" : "identités")).join(", ")}` : ""}` });
      return { ok: true, missing: [] };
    },
    simulateOthers: (projectId) => {
      mutate(projectId, (p) => ({
        ...p,
        participants: p.participants.map((x) => {
          if (x.isAdmin) return x;
          const answers = { ...x.answers };
          for (const qu of questionsFor(p, x)) if (!answers[qu.id]) answers[qu.id] = qu.type === "single" ? (qu.options?.[1] ?? qu.options?.[0] ?? "Oui") : "Réponse de démonstration";
          const docs = { ...x.docs };
          for (const d of docsFor(p, x)) if (!docs[d.id]) docs[d.id] = { name: `${d.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28)}.pdf`, size: 120000 + Math.floor(Math.random() * 600000), at: now() };
          const signed = { ...x.signed }; const approved = { ...x.approved };
          for (const st of p.steps) { if (st.requires.includes("agreement")) signed[st.id] = now(); if (st.requires.includes("approval")) approved[st.id] = true; }
          return { ...x, accepted: "accepted" as const, answers, submitted: true, docs, signed, approved };
        }),
      }), { who: "Démonstration", text: "Les autres participants ont tout rempli, déposé, signé et approuvé" });
    },
  }), [ready, state, mutate]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
const PRICE_EX = "2 à 10 M€";
