"use client";

import { useEffect, useRef, useState } from "react";
import { GenericFlow } from "@/components/demo/GenericFlow";
import { Icon } from "./Icon";
import { SignaturePad } from "./SignaturePad";
import { Avatar, Screen, Sheet, Tile, useToast } from "./ui";
import { enabledSteps, isParty } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project, Question, Step } from "@/lib/demo/types";

// ---------- Questionnaire : une question par écran, puis un résumé à vérifier
export function QuestionFlow({ questions, initial, onDone, onExit }: { questions: Question[]; initial: Record<string, string>; onDone: (a: Record<string, string>) => void; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [a, setA] = useState<Record<string, string>>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);   // modification depuis le résumé : on y revient ensuite
  const input = useRef<HTMLInputElement>(null);
  const n = questions.length; const q = questions[i];
  const advance = () => { if (editing) { setEditing(false); setI(n); } else setI((x) => x + 1); };
  useEffect(() => { input.current?.focus(); }, [i]);

  const next = (val?: string) => {
    if (!q) return;
    const v = (val ?? a[q.id] ?? "").trim();
    if (q.required && !v) return setErr("Cette réponse est requise.");
    setErr(null); advance();
  };
  const left = n - i - 1;
  const mins = Math.max(1, Math.round(n * 0.3));

  if (i >= n) return (
    <Screen onBack={() => setI(n - 1)} title="Vérifiez vos réponses" help="Touchez une réponse pour la modifier.">
      <dl className="kr2-recap">{questions.map((x, k) => (
        <div key={x.id}><dt>{x.label}</dt><dd>{a[x.id] || "—"} <button type="button" onClick={() => { setEditing(true); setI(k); }} aria-label={`Modifier : ${x.label}`}>Modifier</button></dd></div>
      ))}</dl>
      <button type="button" className="kr-btn kr-btn--primary" onClick={() => onDone(a)}>Envoyer mes réponses</button>
    </Screen>
  );

  return (
    <Screen step={i + 1} total={n} onBack={() => (i === 0 ? onExit() : setI(i - 1))} title={q.label}
      help={i === 0 ? `${n} question${n > 1 ? "s" : ""}, environ ${mins} minute${mins > 1 ? "s" : ""}.` : left === 0 ? "Dernière question." : left === 1 ? "Plus qu'une après celle-ci." : undefined}>
      {q.type === "single" ? (
        <div className="kr2-grid">
          {q.options?.map((o) => <Tile key={o} title={o} selected={a[q.id] === o} onClick={() => { setA({ ...a, [q.id]: o }); setErr(null); setTimeout(advance, 170); }} />)}
        </div>
      ) : (
        <form className="kr2-grid" noValidate onSubmit={(e) => { e.preventDefault(); next(); }}>
          <input ref={input} className="kr2-input" aria-label={q.label} value={a[q.id] ?? ""} onChange={(e) => { setA({ ...a, [q.id]: e.target.value }); setErr(null); }} />
          {err && <p className="kr-error" role="alert">{err}</p>}
          <button type="submit" className="kr-btn kr-btn--primary">Continuer</button>
        </form>
      )}
      {q.type === "single" && err && <p className="kr-error" role="alert">{err}</p>}
      {!q.required && <button type="button" className="kr-link" onClick={() => { setErr(null); advance(); }}>Passer cette question (facultatif)</button>}
    </Screen>
  );
}

// ---------- Acceptation du processus
export function AcceptView({ pr, me, onDone, onExit }: { pr: Project; me: Participant; onDone: () => void; onExit: () => void }) {
  const { mutate } = useDemo();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [kind, setKind] = useState<"remove" | "add" | "comment">("comment");
  const [stepId, setStepId] = useState("");
  const [text, setText] = useState("");
  const steps = enabledSteps(pr);
  const send = () => {
    if (kind === "remove" ? !stepId : !text.trim()) return;
    mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, accepted: "changes" } : x)),
      changes: [...p.changes, { id: `r${Date.now().toString(36)}`, by: me.id, kind, stepId: kind === "remove" ? stepId : undefined, text: kind === "remove" ? (p.steps.find((s) => s.id === stepId)?.title ?? "") : text.trim(), status: "open" }] }),
      { who: me.name, text: `Demande de modification : ${kind === "remove" ? "retirer une étape" : kind === "add" ? "ajouter une étape" : "commentaire"}` });
    setAsk(false); toast("Demande envoyée à l'administrateur"); onDone();
  };
  return (
    <Screen onBack={onExit} title="Le processus proposé" help="Voici les étapes prévues pour ce projet. Vous pouvez les accepter ou demander une modification.">
      <GenericFlow steps={pr.steps} />
      <button type="button" className="kr-btn kr-btn--primary" onClick={() => { mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, accepted: "accepted" } : x)) }), { who: me.name, text: "A accepté le processus" }); toast("Processus accepté"); onDone(); }}>J'accepte le processus</button>
      <button type="button" className="kr-btn kr-btn--outline" onClick={() => setAsk(true)}>Je souhaite modifier quelque chose</button>
      <Sheet open={ask} onClose={() => setAsk(false)} title="Demander une modification">
        <Tile title="Retirer une étape" selected={kind === "remove"} onClick={() => setKind("remove")} />
        <Tile title="Ajouter une étape" selected={kind === "add"} onClick={() => setKind("add")} />
        <Tile title="Laisser un commentaire" selected={kind === "comment"} onClick={() => setKind("comment")} />
        {kind === "remove" ? (
          <div className="kr2-grid">{steps.map((s) => <Tile key={s.id} title={s.title} selected={stepId === s.id} onClick={() => setStepId(s.id)} />)}</div>
        ) : <input className="kr2-input" aria-label={kind === "add" ? "Étape à ajouter" : "Votre commentaire"} placeholder={kind === "add" ? "Par exemple : visite du bien" : "Votre commentaire"} value={text} onChange={(e) => setText(e.target.value)} />}
        <button type="button" className="kr-btn kr-btn--primary" onClick={send}>Envoyer la demande</button>
      </Sheet>
    </Screen>
  );
}

// ---------- Signature dessinée
export function SignView({ title, sub, saved, onSign, onExit }: { title: string; sub?: string; saved?: string; onSign: (png: string) => void; onExit: () => void }) {
  const [png, setPng] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <Screen onBack={onExit} title="Votre signature" help={`Vous signez : ${title}.${sub ? ` ${sub}.` : ""}`}>
      {saved && <Tile icon="pencil" title="Utiliser ma signature enregistrée" text="La même que pour vos précédentes signatures" onClick={() => onSign(saved)} />}
      <SignaturePad onChange={setPng} />
      <label className="kr-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>Je confirme vouloir signer.</span></label>
      <button type="button" className="kr-btn kr-btn--primary" disabled={!png || !ok} onClick={() => png && onSign(png)}>Signer</button>
      <p className="kr2-help" style={{ fontSize: 14 }}>Signature électronique certifiée : <span className="kr2-chip kr2-chip--wait">Bientôt disponible</span> (simulation dans la démonstration)</p>
    </Screen>
  );
}

// ---------- Accord de révélation : le moment fort
export function ApproveView({ pr, me, step, name, onApprove, onExit }: { pr: Project; me: Participant; step: Step; name: (p: Participant) => string; onApprove: () => void; onExit: () => void }) {
  const parties = pr.participants.filter(isParty);
  const what = step.reveals.map((r) => (r === "documents" ? "les documents des parties" : "l'identité des parties")).join(" et ");
  return (
    <Screen onBack={onExit} title={step.title}>
      <div className="kr2-reveal">
        <span className="kr2-reveal__ico"><Icon name="unlock" size={30} /></span>
        <h2 className="kr-title-3" style={{ margin: 0 }}>{what ? `Cette étape révèle ${what}` : "Cette étape demande l'accord des parties"}</h2>
        <p>Rien ne sera révélé tant que toutes les parties n'ont pas donné leur accord.</p>
      </div>
      <div className="kr2-grid">
        {parties.map((p) => (
          <Tile key={p.id} as="div" title={p.id === me.id ? `${name(p)} (vous)` : name(p)} text={p.approved[step.id] ? "A donné son accord" : "En attente"} right={<Avatar name={name(p)} status={p.approved[step.id] ? "ok" : "wait"} size={36} />} />
        ))}
      </div>
      {me.approved[step.id] ? <p className="kr-success" role="status">Vous avez donné votre accord.</p> : <button type="button" className="kr-btn kr-btn--primary" onClick={onApprove}>Je donne mon accord</button>}
    </Screen>
  );
}
