"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GenericFlow } from "@/components/demo/GenericFlow";
import { DocsEditor, ProcessEditor, QuestionsEditor, applyPreset } from "@/components/demo/editors";
import { Avatar, Screen, Sheet, Tile, useToast } from "@/components/demo2/ui";
import { PROFILES, ROLES, TEMPLATES, roleShort, templateById } from "@/lib/demo/catalog";
import { checkProcess } from "@/lib/demo/rules";
import { draftFromTemplate, useDemo, type Draft } from "@/lib/demo/store";
import type { Project, RoleKind } from "@/lib/demo/types";
import type { IconName } from "@/components/demo2/Icon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL = 5;
const LEVELS = [
  { id: "simple", title: "Simple", text: "Moins d'étapes, des échanges plus rapides." },
  { id: "equilibre", title: "Équilibré", text: "Le processus proposé, recommandé dans la plupart des cas." },
  { id: "secure", title: "Renforcé", text: "Toutes les étapes et tous les documents." },
] as const;
const PART_ROLES: RoleKind[] = ["sale", "search", "legal", "agent", "other"];

export default function NewProject2() {
  const router = useRouter();
  const toast = useToast();
  const { state, createProject } = useDemo();
  const profile = state.profile!;
  const profRole: RoleKind = PROFILES.find((p) => p.kind === profile?.kind)?.role ?? "introducer";
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => draftFromTemplate("grosse", profRole));
  const [level, setLevel] = useState<(typeof LEVELS)[number]["id"]>("equilibre");
  const [more, setMore] = useState(false);
  const [add, setAdd] = useState(false);
  const [np, setNp] = useState<{ name: string; email: string; role: RoleKind }>({ name: "", email: "", role: "search" });
  const [err, setErr] = useState<string | null>(null);
  const upd = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const t = templateById(d.templateId);

  const preview = useMemo<Project>(() => ({ id: "p", name: d.name, templateId: d.templateId, createdAt: "", adminId: "", participants: [], steps: d.steps, docReqs: d.docReqs, questions: d.questions, options: d.options, revealed: { documents: false, identities: false }, changes: [], log: [], invited: false }), [d]);
  const warnings = checkProcess(preview);
  const next = () => { setErr(null); setStep((s) => Math.min(s + 1, TOTAL - 1)); window.scrollTo({ top: 0 }); };
  const back = () => { setErr(null); setStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0 }); };
  const pickLevel = (id: (typeof LEVELS)[number]["id"]) => {
    setLevel(id);
    setD((x) => id === "secure" ? applyPreset(x, "secure") : id === "simple" ? applyPreset(x, "simple") : { ...draftFromTemplate(x.templateId, x.myRole), name: x.name, participants: x.participants });
  };
  const counts = `${d.steps.filter((x) => x.enabled).length} étapes · ${d.docReqs.filter((x) => x.enabled).length} documents · ${d.questions.filter((x) => x.enabled).length} questions`;

  if (step === 0) return (
    <Screen step={1} total={TOTAL} onBack={() => router.push("/demo2/projets")} title="Que souhaitez-vous faire ?">
      <Tile icon="home" title="Vendre un bien" text="Vous êtes le vendeur ou vous portez un mandat de vente" selected={d.myRole === "sale"} onClick={() => { upd({ myRole: "sale" }); setTimeout(next, 160); }} />
      <Tile icon="key" title="Chercher un bien" text="Vous êtes l'acquéreur ou vous portez un mandat de recherche" selected={d.myRole === "search"} onClick={() => { upd({ myRole: "search" }); setTimeout(next, 160); }} />
      <Tile icon="users" title="Accompagner une transaction" text="Vous êtes agent, apporteur d'affaires ou conseil" selected={d.myRole === "agent" || d.myRole === "introducer" || d.myRole === "legal"} onClick={() => { upd({ myRole: profRole === "agent" || profRole === "legal" ? profRole : "introducer" }); setTimeout(next, 160); }} />
    </Screen>
  );

  if (step === 1) return (
    <Screen step={2} total={TOTAL} onBack={back} title="Quel type de transaction ?" help="Chaque modèle est une proposition : vous pourrez tout ajuster.">
      {TEMPLATES.map((tp) => <Tile key={tp.id} icon={tp.id === "grosse" ? "building" : tp.id === "standard" ? "home" : "pencil"} title={tp.name} text={`${tp.tag} · ${tp.blurb}`} selected={d.templateId === tp.id} onClick={() => { setD((x) => ({ ...draftFromTemplate(tp.id, x.myRole), name: x.name, participants: x.participants })); setLevel("equilibre"); setTimeout(next, 160); }} />)}
    </Screen>
  );

  if (step === 2) return (
    <Screen step={3} total={TOTAL} onBack={back} title="Quel niveau de sécurité ?" help="Vous pourrez le modifier ensuite, et chaque participant pourra demander des changements.">
      {LEVELS.map((l) => <Tile key={l.id} icon={l.id === "simple" ? "clock" : l.id === "secure" ? "shield" : "check"} title={l.title} text={l.text} selected={level === l.id} onClick={() => pickLevel(l.id)} />)}
      <p className="kr2-help" style={{ fontSize: 14 }}>{counts}</p>
      <button type="button" className="kr-btn kr-btn--primary" onClick={next}>Continuer</button>
      <button type="button" className="kr-link" onClick={() => setMore(true)}>Personnaliser en détail</button>
      <Sheet open={more} onClose={() => setMore(false)} title="Personnaliser">
        <details className="kr-details" open><summary>Le processus</summary><ProcessEditor d={d} setD={setD} upd={upd} warnings={warnings} /></details>
        <details className="kr-details"><summary>Les questions</summary><QuestionsEditor d={d} upd={upd} /></details>
        <details className="kr-details"><summary>Les documents</summary><DocsEditor d={d} upd={upd} /></details>
        <button type="button" className="kr-btn kr-btn--primary" onClick={() => setMore(false)}>Terminé</button>
      </Sheet>
    </Screen>
  );

  if (step === 3) return (
    <Screen step={4} total={TOTAL} onBack={back} title="Qui invitez-vous ?" help="Chaque personne reçoit un rôle. Vous pouvez aussi inviter plus tard.">
      <Tile as="div" icon="user" title="Vous" text={`${ROLES[d.myRole].label} · administrateur`} />
      {d.participants.map((p, i) => (
        <Tile key={i} as="div" icon="user" title={p.name} text={`${roleShort(p.role)} · ${p.email}`} right={<button type="button" className="kr2-back" onClick={() => upd({ participants: d.participants.filter((_, k) => k !== i) })} aria-label={`Retirer ${p.name}`}>Retirer</button>} />
      ))}
      <Tile icon="plus" title="Ajouter une personne" text="Vente, recherche, notaire, autre…" onClick={() => { setNp({ name: "", email: "", role: d.myRole === "sale" ? "search" : "sale" }); setErr(null); setAdd(true); }} />
      {d.participants.length === 0 && <p className="kr2-help" style={{ fontSize: 14 }}>Astuce : ajoutez la partie vente et la partie recherche.</p>}
      <button type="button" className="kr-btn kr-btn--primary" onClick={next}>Continuer</button>
      <Sheet open={add} onClose={() => setAdd(false)} title="Ajouter une personne">
        <form className="kr2-grid" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (!np.name.trim() || !EMAIL_RE.test(np.email.trim())) return setErr("Indiquez un nom et une adresse email valide.");
          upd({ participants: [...d.participants, { name: np.name.trim(), email: np.email.trim(), role: np.role }].slice(0, 5) }); setAdd(false);
          toast(`${np.name.trim()} ajouté`);
        }}>
          <input className="kr2-input" placeholder="Nom" aria-label="Nom" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
          <input className="kr2-input" type="email" inputMode="email" placeholder="Email" aria-label="Email" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} />
          <p className="kr2-help" style={{ fontSize: 14 }}>Son rôle</p>
          {PART_ROLES.map((r) => <Tile key={r} icon={(r === "sale" ? "home" : r === "search" ? "key" : r === "legal" ? "shield" : r === "agent" ? "building" : "user") as IconName} title={ROLES[r].label} selected={np.role === r} onClick={() => setNp({ ...np, role: r })} />)}
          {err && <p className="kr-error" role="alert">{err}</p>}
          <button type="submit" className="kr-btn kr-btn--primary">Ajouter</button>
        </form>
      </Sheet>
    </Screen>
  );

  return (
    <Screen step={5} total={TOTAL} onBack={back} title="Tout est prêt" help="Voici ce que vos invités vont recevoir.">
      <div className="kr2-card">
        <p className="kr2-eyebrow">{t.name}</p>
        <input className="kr2-input" placeholder={t.name} aria-label="Nom du projet" value={d.name} onChange={(e) => upd({ name: e.target.value })} />
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{counts} · révélation {d.options.revealRule === "both" ? "avec l'accord des parties" : "décidée par vous"}</p>
        <div className="kr2-people">
          <span className="kr2-person"><Avatar name="Vous" size={44} />Vous</span>
          {d.participants.map((p, i) => <span key={i} className="kr2-person"><Avatar name={p.name} size={44} />{p.name.split(" ")[0]}</span>)}
        </div>
      </div>
      {warnings.some((w) => w.level === "warning") && <div className="kr-banner kr-banner--warn" role="note">{warnings.filter((w) => w.level === "warning").map((w, i) => <p key={i}>À vérifier : {w.text}</p>)}</div>}
      <details className="kr-details"><summary>Voir le processus proposé</summary><GenericFlow steps={d.steps} showStatus={false} /></details>
      <div className="kr-banner"><p>Chaque invité pourra accepter le processus ou demander une modification. Démonstration : aucun email n'est envoyé, vous agirez en leur nom depuis le projet.</p></div>
      <button type="button" className="kr-btn kr-btn--primary" onClick={() => { const id = createProject(d, profile); toast("Invitations envoyées"); router.push(`/demo2/projets/${id}`); }}>Envoyer les invitations</button>
    </Screen>
  );
}
