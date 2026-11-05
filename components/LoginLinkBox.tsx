"use client";

import { useState } from "react";

// Affiche un lien de connexion (adresse complète du site) avec un bouton pour le copier.
export function LoginLinkBox({ path }: { path: string }) {
  const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
  }
  return (
    <div className="kr-linkbox">
      <label htmlFor="login-link" className="kr-small">Lien de connexion</label>
      <input id="login-link" className="kr-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="kr-btn kr-btn--outline" onClick={copy}>{copied ? "Lien copié" : "Copier le lien"}</button>
      <p className="kr-hint">À ouvrir dans une fenêtre de navigation privée. Il ne fonctionne qu'une fois et donne accès au compte de cette personne : transmettez-le uniquement à elle.</p>
    </div>
  );
}
