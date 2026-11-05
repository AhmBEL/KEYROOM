"use client";

import { useActionState } from "react";
import { inviteParty, type InviteState } from "./actions";
import { LoginLinkBox } from "@/components/LoginLinkBox";

type DealOption = { id: string; reference: string };

export function InviteForm({ deals }: { deals: DealOption[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteParty, null);
  return (
    <form action={action} className="kr-form">
      <div className="kr-field">
        <label htmlFor="email">Adresse email</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="off" className="kr-input" required />
      </div>
      <div className="kr-field">
        <label htmlFor="prenom">Prénom</label>
        <input id="prenom" name="prenom" type="text" autoComplete="off" maxLength={80} className="kr-input" required />
      </div>
      <div className="kr-field">
        <label htmlFor="nom">Nom</label>
        <input id="nom" name="nom" type="text" autoComplete="off" maxLength={80} className="kr-input" required />
      </div>
      <div className="kr-field">
        <label htmlFor="role">Partie</label>
        <select id="role" name="role" className="kr-input" defaultValue="partie_mandat">
          <option value="partie_mandat">Mandat</option>
          <option value="partie_investisseurs">Investisseurs</option>
        </select>
      </div>
      <div className="kr-field">
        <label htmlFor="deal">Dossier</label>
        <select id="deal" name="deal" className="kr-input" defaultValue="new">
          <option value="new">Nouveau dossier</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.reference}</option>)}
        </select>
        <p className="kr-hint">Un nouveau dossier reçoit sa référence automatiquement.</p>
      </div>
      <label className="kr-check">
        <input type="checkbox" name="send_email" defaultChecked />
        <span>Envoyer l'email d'invitation<br /><span className="kr-small">Décochez pour un test : aucun email n'est envoyé, vous obtenez un lien de connexion à transmettre vous-même.</span></span>
      </label>
      {state && (
        <p className={state.ok ? "kr-success" : "kr-error"} role={state.ok ? "status" : "alert"}>
          {state.ok ? "Terminé : " : ""}{state.message}
        </p>
      )}
      {state?.link && <LoginLinkBox path={state.link} />}
      <button type="submit" className="kr-btn kr-btn--primary" disabled={pending}>
        {pending ? "Envoi…" : "Créer l'invitation"}
      </button>
    </form>
  );
}
