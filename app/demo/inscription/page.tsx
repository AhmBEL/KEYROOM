"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROFILES } from "@/lib/demo/catalog";
import { emptyProfile, useDemo } from "@/lib/demo/store";
import type { Profile, ProfileKind } from "@/lib/demo/types";
import { Soon } from "@/components/demo/Soon";

const GOOGLE_ACCOUNTS = [
  { firstName: "Camille", lastName: "Martin", email: "camille.martin@gmail.com" },
  { firstName: "Julien", lastName: "Bernard", email: "julien.bernard@gmail.com" },
];
const CODE = "123456";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inscription : Google ou adresse professionnelle avec code de vérification (simulés), puis
// « enregistrer vos informations maintenant ? ». Rien n'est envoyé : le code s'affiche à l'écran.
export default function SignUpPage() {
  const router = useRouter();
  const { setProfile, patchProfile, state } = useDemo();
  const [step, setStep] = useState<"method" | "google" | "email" | "code" | "save" | "profile">("method");
  const [draft, setDraft] = useState<Profile>(state.profile ?? emptyProfile());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  const finish = (save: boolean) => {
    setProfile({ ...draft, saved: save });
    router.push("/demo/bienvenue");
  };

  return (
    <>
      <h1 className="kr-title-2">Créer votre compte</h1>

      {step === "method" && (
        <div className="kr-grid">
          <p className="kr-body">Choisissez comment vous connecter. Un email de vérification confirme votre adresse.</p>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => setStep("google")}>Continuer avec Google</button>
          <button type="button" className="kr-btn kr-btn--outline" onClick={() => setStep("email")}>Avec mon adresse professionnelle</button>
          <p className="kr-hint">Démonstration : la connexion Google et l'envoi du code sont simulés.</p>
        </div>
      )}

      {step === "google" && (
        <div className="kr-grid">
          <p className="kr-body">Choisissez un compte Google (simulation).</p>
          <ul className="kr-list">
            {GOOGLE_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <strong>{a.firstName} {a.lastName}</strong>
                <span className="kr-small">{a.email}</span>
                <button type="button" className="kr-btn kr-btn--outline kr-btn--small" onClick={() => { set({ ...a, via: "google" }); setDraft((d) => ({ ...d, ...a, via: "google" })); setStep("save"); }}>Utiliser ce compte</button>
              </li>
            ))}
          </ul>
          <button type="button" className="kr-link" onClick={() => setStep("method")}>Retour</button>
        </div>
      )}

      {step === "email" && (
        <form className="kr-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (!draft.firstName.trim() || !draft.lastName.trim()) return setError("Indiquez votre prénom et votre nom.");
          if (!EMAIL_RE.test(draft.email.trim())) return setError("Cette adresse email n'est pas valide. Vérifiez-la, par exemple prenom@societe.com.");
          setError(null); set({ via: "email" }); setStep("code");
        }}>
          <div className="kr-field"><label htmlFor="fn">Prénom</label><input id="fn" className="kr-input" autoComplete="given-name" value={draft.firstName} onChange={(e) => set({ firstName: e.target.value })} /></div>
          <div className="kr-field"><label htmlFor="ln">Nom</label><input id="ln" className="kr-input" autoComplete="family-name" value={draft.lastName} onChange={(e) => set({ lastName: e.target.value })} /></div>
          <div className="kr-field"><label htmlFor="em">Adresse email professionnelle</label><input id="em" type="email" inputMode="email" autoComplete="email" className="kr-input" value={draft.email} onChange={(e) => set({ email: e.target.value })} /></div>
          {error && <p className="kr-error" role="alert">{error}</p>}
          <button type="submit" className="kr-btn kr-btn--primary">Recevoir le code de vérification</button>
          <button type="button" className="kr-link" onClick={() => setStep("method")}>Retour</button>
        </form>
      )}

      {step === "code" && (
        <form className="kr-form" noValidate onSubmit={(e) => { e.preventDefault(); if (code.trim() !== CODE) return setError("Ce code est incorrect. Vérifiez-le dans l'email reçu."); setError(null); setStep("save"); }}>
          <div className="kr-banner"><p>Un code de vérification a été envoyé à <strong>{draft.email}</strong>.</p><p>Démonstration : aucun email n'est envoyé, le code est <strong>{CODE}</strong>.</p></div>
          <div className="kr-field"><label htmlFor="code">Code reçu par email</label><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="kr-input kr-input--code" value={code} onChange={(e) => setCode(e.target.value)} />{error && <p className="kr-error" role="alert">{error}</p>}</div>
          <button type="submit" className="kr-btn kr-btn--primary">Vérifier mon adresse</button>
          <button type="button" className="kr-link" onClick={() => setCode(CODE)}>Remplir le code de démonstration</button>
        </form>
      )}

      {step === "save" && (
        <div className="kr-grid">
          <div className="kr-banner"><p>Adresse vérifiée : <strong>{draft.email}</strong>.</p></div>
          <h2 className="kr-title-3">Enregistrer vos informations maintenant ?</h2>
          <p className="kr-body">Vous éviterez de les ressaisir à chaque projet : identité, société, adresse et profil sont préremplis. Vous pouvez les modifier à tout moment.</p>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => setStep("profile")}>Oui, les enregistrer maintenant</button>
          <button type="button" className="kr-btn kr-btn--outline" onClick={() => finish(false)}>Plus tard</button>
        </div>
      )}

      {step === "profile" && (
        <form className="kr-form" noValidate onSubmit={(e) => { e.preventDefault(); if (!draft.kind) return setError("Choisissez votre profil."); finish(true); }}>
          <div className="kr-field">
            <label htmlFor="kind">Votre profil</label>
            <select id="kind" className="kr-input" value={draft.kind ?? ""} onChange={(e) => set({ kind: (e.target.value || null) as ProfileKind | null })}>
              <option value="">Choisir…</option>
              {PROFILES.map((p) => <option key={p.kind} value={p.kind}>{p.label}</option>)}
            </select>
            <p className="kr-hint">Il sera présélectionné quand vous créerez un projet.</p>
          </div>
          <div className="kr-field"><label htmlFor="co">Société ou agence</label><input id="co" className="kr-input" autoComplete="organization" value={draft.company} onChange={(e) => set({ company: e.target.value })} /><p className="kr-hint">Facultatif</p></div>
          <div className="kr-field"><label htmlFor="ct">Pays</label><input id="ct" className="kr-input" autoComplete="country-name" value={draft.country} onChange={(e) => set({ country: e.target.value })} /></div>
          <div className="kr-field"><label htmlFor="ad">Adresse</label><input id="ad" className="kr-input" autoComplete="street-address" value={draft.address} onChange={(e) => set({ address: e.target.value })} /><p className="kr-hint">Rue, code postal, ville</p></div>
          <div className="kr-field"><label htmlFor="ph">Téléphone</label><input id="ph" type="tel" className="kr-input" autoComplete="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
          <p className="kr-hint">Vérification automatique de l'identité et de la société : <Soon /></p>
          {error && <p className="kr-error" role="alert">{error}</p>}
          <button type="submit" className="kr-btn kr-btn--primary">Enregistrer et continuer</button>
          <button type="button" className="kr-link" onClick={() => { patchProfile({}); finish(false); }}>Passer cette étape</button>
        </form>
      )}
    </>
  );
}
