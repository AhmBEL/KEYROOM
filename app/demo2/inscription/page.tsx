"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/demo2/Icon";
import { Arch, Screen, Sheet, Tile } from "@/components/demo2/ui";
import { PROFILES } from "@/lib/demo/catalog";
import { emptyProfile, useDemo } from "@/lib/demo/store";
import type { Profile, ProfileKind } from "@/lib/demo/types";

const CODE = "123456";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIND_ICON: Record<ProfileKind, IconName> = { agent: "building", apporteur: "link", proprietaire: "home", acquereur: "key", mandat_vente: "file", mandat_recherche: "eye", notaire: "shield", avocat: "pencil", autre: "user" };
type Step = "start" | "email" | "code" | "name" | "kind" | "save" | "extra";

function Otp({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("");
  const set = (i: number, c: string) => {
    const next = digits.map((d, k) => (k === i ? (c || " ") : d)).join("").replace(/\s+$/, "");
    onChange(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
    if (next.length === 6 && !next.includes(" ")) onDone(next);
  };
  return (
    <div className="kr2-otp" onPaste={(e) => { const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (t) { e.preventDefault(); onChange(t); if (t.length === 6) onDone(t); } }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1} aria-label={`Chiffre ${i + 1}`}
          value={d.trim()} onChange={(e) => set(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus(); }} />
      ))}
    </div>
  );
}

export default function SignUp2() {
  const router = useRouter();
  const { state, setProfile } = useDemo();
  const [step, setStep] = useState<Step>("start");
  const [p, setP] = useState<Profile>(state.profile ?? emptyProfile());
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [google, setGoogle] = useState(false);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); }, [step]);

  const order: Step[] = p.via === "google" ? ["kind", "save", "extra"] : ["email", "code", "name", "kind", "save", "extra"];
  const idx = order.indexOf(step); const total = order.length;
  const go = (s: Step) => { setErr(null); setStep(s); };
  const back = () => { const i = order.indexOf(step); go(i <= 0 ? "start" : order[i - 1]); };
  const finish = (saved: boolean) => { setProfile({ ...p, saved }); router.push("/demo2/bienvenue"); };

  if (step === "start") return (
    <Screen title="Créez votre compte" help="Quelques secondes. Vos informations restent privées.">
      <div style={{ display: "grid", justifyItems: "center" }}><Arch icon="key" size={110} /></div>
      <Tile icon="globe" title="Continuer avec Google" text="Le plus rapide" onClick={() => setGoogle(true)} />
      <Tile icon="mail" title="Utiliser mon adresse professionnelle" text="Nous vérifions votre adresse par un code" onClick={() => { set({ via: "email" }); go("email"); }} />
      <Sheet open={google} onClose={() => setGoogle(false)} title="Choisissez un compte Google">
        <p className="kr2-help">Simulation : aucun compte réel n'est utilisé.</p>
        {[{ firstName: "Camille", lastName: "Martin", email: "camille.martin@gmail.com" }, { firstName: "Julien", lastName: "Bernard", email: "julien.bernard@gmail.com" }].map((a) => (
          <Tile key={a.email} icon="user" title={`${a.firstName} ${a.lastName}`} text={a.email} onClick={() => { setGoogle(false); setP((x) => ({ ...x, ...a, via: "google" })); setStep("kind"); }} />
        ))}
      </Sheet>
    </Screen>
  );

  if (step === "email") return (
    <Screen step={idx + 1} total={total} onBack={back} title="Quelle est votre adresse professionnelle ?" help="Nous vous envoyons un code pour la vérifier.">
      <form className="kr2-grid" noValidate onSubmit={(e) => { e.preventDefault(); if (!EMAIL_RE.test(p.email.trim())) return setErr("Cette adresse n'est pas valide. Vérifiez-la, par exemple prenom@societe.com."); go("code"); }}>
        <input ref={first} className="kr2-input" type="email" inputMode="email" autoComplete="email" placeholder="prenom@societe.com" aria-label="Adresse email professionnelle" value={p.email} onChange={(e) => set({ email: e.target.value })} />
        {err && <p className="kr-error" role="alert">{err}</p>}
        <button type="submit" className="kr-btn kr-btn--primary">Recevoir le code</button>
      </form>
    </Screen>
  );

  if (step === "code") return (
    <Screen step={idx + 1} total={total} onBack={back} title="Entrez le code reçu" help={`Un code à 6 chiffres a été envoyé à ${p.email}.`}>
      <Otp value={code} onChange={(v) => { setCode(v); setErr(null); }} onDone={(v) => { if (v === CODE) go("name"); else setErr("Ce code est incorrect. Vérifiez-le dans l'email reçu."); }} />
      {err && <p className="kr-error" role="alert">{err}</p>}
      <div className="kr-banner"><p>Démonstration : aucun email n'est envoyé. Le code est <strong>{CODE}</strong>.</p></div>
      <button type="button" className="kr-btn kr-btn--outline" onClick={() => { setCode(CODE); go("name"); }}>Remplir le code de démonstration</button>
    </Screen>
  );

  if (step === "name") return (
    <Screen step={idx + 1} total={total} onBack={back} title="Comment vous appelez-vous ?">
      <form className="kr2-grid" noValidate onSubmit={(e) => { e.preventDefault(); if (!p.firstName.trim() || !p.lastName.trim()) return setErr("Indiquez votre prénom et votre nom."); go("kind"); }}>
        <input ref={first} className="kr2-input" autoComplete="given-name" placeholder="Prénom" aria-label="Prénom" value={p.firstName} onChange={(e) => set({ firstName: e.target.value })} />
        <input className="kr2-input" autoComplete="family-name" placeholder="Nom" aria-label="Nom" value={p.lastName} onChange={(e) => set({ lastName: e.target.value })} />
        {err && <p className="kr-error" role="alert">{err}</p>}
        <button type="submit" className="kr-btn kr-btn--primary">Continuer</button>
      </form>
    </Screen>
  );

  if (step === "kind") return (
    <Screen step={idx + 1} total={total} onBack={back} title={`Enchanté${p.firstName ? `, ${p.firstName}` : ""}. Quel est votre métier ?`} help="Il sera présélectionné quand vous créerez un projet.">
      <div className="kr2-grid">
        {PROFILES.map((x) => <Tile key={x.kind} icon={KIND_ICON[x.kind]} title={x.label} text={x.blurb} selected={p.kind === x.kind} onClick={() => { set({ kind: x.kind }); setTimeout(() => go("save"), 160); }} />)}
      </div>
    </Screen>
  );

  if (step === "save") return (
    <Screen step={idx + 1} total={total} onBack={back} title="Voulez-vous enregistrer vos informations ?" help="Vous éviterez de les ressaisir à chaque projet. Vous pourrez les modifier quand vous voulez.">
      <Tile icon="check" title="Oui, gagner du temps" text="Société et pays, en deux questions" onClick={() => go("extra")} />
      <Tile icon="clock" title="Plus tard" text="Je les renseignerai au fil des projets" onClick={() => finish(false)} />
    </Screen>
  );

  return (
    <Screen step={idx + 1} total={total} onBack={back} title="Votre société" help="Facultatif. Vous pourrez compléter votre profil plus tard.">
      <form className="kr2-grid" onSubmit={(e) => { e.preventDefault(); finish(true); }}>
        <input ref={first} className="kr2-input" autoComplete="organization" placeholder="Société ou agence" aria-label="Société ou agence" value={p.company} onChange={(e) => set({ company: e.target.value })} />
        <input className="kr2-input" autoComplete="country-name" placeholder="Pays" aria-label="Pays" value={p.country} onChange={(e) => set({ country: e.target.value })} />
        <p className="kr2-help" style={{ fontSize: 14 }}>Vérification automatique de l'identité et de la société : <span className="kr2-chip kr2-chip--wait">Bientôt disponible</span></p>
        <button type="submit" className="kr-btn kr-btn--primary">Terminer</button>
        <button type="button" className="kr-link" onClick={() => finish(true)}>Passer</button>
      </form>
    </Screen>
  );
}
