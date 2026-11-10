"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROFILES, profileFor } from "@/lib/demo/catalog";
import { useDemo } from "@/lib/demo/store";
import type { ProfileKind } from "@/lib/demo/types";

const HOW: Record<string, string> = {
  agent: "Vos clients voient un cadre sérieux dès le premier échange : questionnaire, mandat généré, signature, puis un processus clair. Vous gagnez en crédibilité et en rapidité.",
  apporteur: "Vous arbitrez : vous réglez le processus, vous invitez les parties et vous décidez, avec elles, du moment où chaque information se révèle.",
  proprietaire: "Vous déposez vos documents (titre, diagnostics, etc.) une fois. Ils ne sont révélés que si vous le décidez et que le processus est respecté.",
  acquereur: "Vous déposez vos pièces (preuve de fonds, identité) en confiance. L'autre partie ne les voit qu'au bon moment.",
  mandat_vente: "Vous présentez vos biens sans exposer vos mandants : les documents restent privés jusqu'à l'étape convenue.",
  mandat_recherche: "Vous présentez vos acquéreurs sans les exposer : leurs pièces restent privées jusqu'à l'étape convenue.",
  notaire: "Vous voyez l'avancement du dossier et les pièces qui vous sont destinées, avant de passer à l'acte.",
  avocat: "Vous suivez le processus de votre client et vérifiez que les étapes protègent bien ses intérêts.",
  autre: "Vous choisissez votre rôle projet par projet.",
};

export default function WelcomePage() {
  const router = useRouter();
  const { state, patchProfile, seedExample } = useDemo();
  const profile = state.profile;
  const [i, setI] = useState(0);
  const kind = profile?.kind ?? null;
  const p = profileFor(kind);
  const slides = 4;

  const done = (example: boolean) => {
    patchProfile({ onboarded: true });
    if (example && profile) { const id = seedExample({ ...profile, onboarded: true }); router.push(`/demo/projets/${id}`); }
    else router.push("/demo/projets/nouveau");
  };

  return (
    <>
      <div className="kr-progress-dots" aria-hidden="true">{Array.from({ length: slides }, (_, k) => <i key={k} data-on={k <= i} />)}</div>

      {i === 0 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Bienvenue{profile?.firstName ? `, ${profile.firstName}` : ""}</h1>
          <p className="kr-body">Quelques écrans pour comprendre à quoi sert la plateforme. Cela prend une minute.</p>
          <div className="kr-field">
            <label htmlFor="who">Qui êtes-vous ?</label>
            <select id="who" className="kr-input" value={kind ?? ""} onChange={(e) => patchProfile({ kind: (e.target.value || null) as ProfileKind | null })}>
              <option value="">Choisir mon profil…</option>
              {PROFILES.map((x) => <option key={x.kind} value={x.kind}>{x.label}</option>)}
            </select>
            {p && <p className="kr-hint">{p.blurb}</p>}
          </div>
          <button type="button" className="kr-btn kr-btn--primary" disabled={!kind} onClick={() => setI(1)}>Continuer</button>
        </div>
      )}

      {i === 1 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Ce que cela change pour vous</h1>
          <p className="kr-body">{HOW[kind ?? "autre"]}</p>
          <div className="kr-banner"><p>Quand vous créerez un projet, votre rôle « {p?.label} » sera déjà sélectionné.</p></div>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => setI(2)}>Continuer</button>
          <button type="button" className="kr-link" onClick={() => setI(0)}>Retour</button>
        </div>
      )}

      {i === 2 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Comment ça marche</h1>
          <ol className="kr-list">
            <li><strong>1. Vous créez un projet</strong><span className="kr-small">Vous choisissez un modèle (grosse transaction, vente standard ou projet libre).</span></li>
            <li><strong>2. Vous invitez les parties</strong><span className="kr-small">Chacune reçoit un rôle : vente, recherche, agent, notaire…</span></li>
            <li><strong>3. Le processus est proposé</strong><span className="kr-small">Chaque partie peut l'accepter ou demander une modification. Vous gardez la main.</span></li>
            <li><strong>4. Chacun dépose ses documents</strong><span className="kr-small">Dans son espace privé, sans attendre que l'autre dépose le premier.</span></li>
            <li><strong>5. Tout se révèle par étapes</strong><span className="kr-small">Selon le processus et l'accord des parties.</span></li>
          </ol>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => setI(3)}>Continuer</button>
          <button type="button" className="kr-link" onClick={() => setI(1)}>Retour</button>
        </div>
      )}

      {i === 3 && (
        <div className="kr-grid">
          <h1 className="kr-title-2">Le garde-fou</h1>
          <p className="kr-body">Chacun voit seulement si l'autre a tout déposé : « complet » ou « incomplet ». Personne ne voit le contenu tant que l'étape prévue n'est pas validée. Cela rassure tout le monde et évite que la transaction se bloque.</p>
          <button type="button" className="kr-btn kr-btn--primary" onClick={() => done(false)}>Créer mon premier projet</button>
          <button type="button" className="kr-btn kr-btn--outline" onClick={() => done(true)}>Explorer un projet d'exemple</button>
          <button type="button" className="kr-link" onClick={() => setI(2)}>Retour</button>
        </div>
      )}
    </>
  );
}
