"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { recordLogin } from "./actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Cette adresse email n'est pas valide. Vérifiez-la, par exemple prenom@societe.com.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err?.status === 429) {
      setError("Trop de demandes. Patientez une minute, puis demandez un nouveau code.");
      return;
    }
    // Seule une adresse non invitée reçoit la réponse neutre. Toute autre erreur
    // (réseau, configuration, envoi d'email) est annoncée, pour ne pas attendre un code qui ne viendra pas.
    const notInvited = err && (err.status === 422 || ["otp_disabled", "signup_disabled", "user_not_found"].includes(err.code ?? ""));
    if (err && !notInvited) {
      setError("Le code n'a pas pu être envoyé. Vérifiez votre connexion et réessayez. Si cela continue, la configuration de l'envoi d'emails doit être vérifiée.");
      return;
    }
    // Même réponse que l'adresse soit invitée ou non : on ne révèle pas qui a un accès.
    setEmail(value);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(token)) {
      setError("Le code contient 6 chiffres. Vérifiez votre email.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.verifyOtp({ email, token, type: "email" });
    if (err) {
      setBusy(false);
      setError("Ce code est incorrect ou a expiré. Vérifiez votre email, ou demandez un nouveau code.");
      return;
    }
    await recordLogin().catch(() => undefined);
    router.replace("/dossier");
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} noValidate className="kr-form">
        <div className="kr-field">
          <label htmlFor="email">Adresse email</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email"
            className="kr-input" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined} aria-describedby="email-hint" required />
          <p id="email-hint" className="kr-hint">Utilisez l&rsquo;adresse à laquelle vous avez été invité.</p>
          {error && <p className="kr-error" role="alert">{error}</p>}
        </div>
        <button type="submit" className="kr-btn kr-btn--primary" disabled={busy}>
          {busy ? "Envoi…" : "Recevoir un code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} noValidate className="kr-form">
      <p className="kr-body">
        Si <strong>{email}</strong> est invitée, un code à 6 chiffres vient d&rsquo;être envoyé. Il est valable peu de temps.
      </p>
      <div className="kr-field">
        <label htmlFor="code">Code reçu par email</label>
        <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} pattern="[0-9]*" className="kr-input kr-input--code" value={code}
          onChange={(e) => setCode(e.target.value)} aria-invalid={error ? true : undefined}
          aria-describedby="code-hint" required autoFocus />
        <p id="code-hint" className="kr-hint">6 chiffres. Pensez à vérifier vos courriers indésirables.</p>
        {error && <p className="kr-error" role="alert">{error}</p>}
      </div>
      <button type="submit" className="kr-btn kr-btn--primary" disabled={busy}>
        {busy ? "Vérification…" : "Se connecter"}
      </button>
      <button type="button" className="kr-btn kr-btn--outline" disabled={busy}
        onClick={() => { setCode(""); setError(null); setStep("email"); }}>
        Changer d&rsquo;adresse
      </button>
      <button type="button" className="kr-link" disabled={busy} onClick={() => sendCode()}>
        Renvoyer un code
      </button>
    </form>
  );
}
