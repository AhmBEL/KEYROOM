"use client";

import { useState } from "react";
import { PROFILES } from "@/lib/demo/catalog";
import { emptyProfile, useDemo } from "@/lib/demo/store";
import type { ProfileKind } from "@/lib/demo/types";
import { Soon } from "@/components/demo/Soon";

export default function ProfilePage() {
  const { state, patchProfile } = useDemo();
  const p = state.profile ?? emptyProfile();
  const [saved, setSaved] = useState(false);
  const bind = (k: "firstName" | "lastName" | "company" | "country" | "address" | "phone") => ({ value: p[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setSaved(false); patchProfile({ [k]: e.target.value }); } });

  return (
    <>
      <h1 className="kr-title-2">Mon profil</h1>
      <p className="kr-body">Ces informations préremplissent vos projets. Connexion : {p.via === "google" ? "compte Google" : "adresse professionnelle"} ({p.email}).</p>
      <form className="kr-form" onSubmit={(e) => { e.preventDefault(); patchProfile({ saved: true }); setSaved(true); }}>
        <div className="kr-field"><label htmlFor="pk">Mon profil</label>
          <select id="pk" className="kr-input" value={p.kind ?? ""} onChange={(e) => { setSaved(false); patchProfile({ kind: (e.target.value || null) as ProfileKind | null }); }}>
            <option value="">Choisir…</option>{PROFILES.map((x) => <option key={x.kind} value={x.kind}>{x.label}</option>)}
          </select></div>
        <div className="kr-field"><label htmlFor="pf">Prénom</label><input id="pf" className="kr-input" {...bind("firstName")} /></div>
        <div className="kr-field"><label htmlFor="pl">Nom</label><input id="pl" className="kr-input" {...bind("lastName")} /></div>
        <div className="kr-field"><label htmlFor="pc">Société ou agence</label><input id="pc" className="kr-input" {...bind("company")} /></div>
        <div className="kr-field"><label htmlFor="pp">Pays</label><input id="pp" className="kr-input" {...bind("country")} /></div>
        <div className="kr-field"><label htmlFor="pa">Adresse</label><input id="pa" className="kr-input" {...bind("address")} /></div>
        <div className="kr-field"><label htmlFor="pt">Téléphone</label><input id="pt" type="tel" className="kr-input" {...bind("phone")} /></div>
        <div className="kr-banner"><p>Vérification automatique de l'identité et de la société <Soon />. Coffre de documents réutilisable <Soon />.</p></div>
        {saved && <p className="kr-success" role="status">Terminé : informations enregistrées.</p>}
        <button type="submit" className="kr-btn kr-btn--primary">Enregistrer</button>
      </form>
    </>
  );
}
