"use client";

import { useActionState } from "react";
import { updateSettings, type ActionResult } from "./actions";

type S = { droit_applicable: string; duree_protection_mois: number; duree_confidentialite_ans: number; repartition: { mandat: number; investisseurs: number; ahmed: number } };

export function SettingsForm({ dealId, settings }: { dealId: string; settings: S }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateSettings.bind(null, dealId), null);
  const num = (name: string, label: string, value: number, min: number, max: number) => (
    <div className="kr-field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" inputMode="numeric" min={min} max={max} defaultValue={value} className="kr-input" required />
    </div>
  );
  return (
    <form action={action} className="kr-form">
      <div className="kr-field">
        <label htmlFor="droit_applicable">Droit applicable</label>
        <select id="droit_applicable" name="droit_applicable" className="kr-input" defaultValue={settings.droit_applicable}>
          <option value="maurice_arbitrage">Droit de Maurice, avec arbitrage</option>
          <option value="anglais">Droit anglais</option>
        </select>
      </div>
      {num("duree_protection_mois", "Protection et non-contournement (mois, 12 à 24)", settings.duree_protection_mois, 12, 24)}
      {num("duree_confidentialite_ans", "Confidentialité (années, 2 à 5)", settings.duree_confidentialite_ans, 2, 5)}
      <p className="kr-hint">Répartition de la commission, en % (le total doit faire 100).</p>
      {num("mandat", "Partie mandat", settings.repartition.mandat, 0, 100)}
      {num("investisseurs", "Partie investisseurs", settings.repartition.investisseurs, 0, 100)}
      {num("ahmed", "Intermédiaire", settings.repartition.ahmed, 0, 100)}
      {state && <p className={state.ok ? "kr-success" : "kr-error"} role={state.ok ? "status" : "alert"}>{state.ok ? "Terminé : " : ""}{state.message}</p>}
      <button type="submit" className="kr-btn kr-btn--outline" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les paramètres"}</button>
    </form>
  );
}
