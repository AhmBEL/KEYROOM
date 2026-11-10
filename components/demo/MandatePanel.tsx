"use client";

import { useState } from "react";
import { Soon } from "./Soon";
import { buildMandatePdf, openPdf } from "@/lib/demo/mandate";
import { sideOf, questionsFor } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project } from "@/lib/demo/types";

const STATUS = { draft: "Brouillon à valider", validated: "Validé, en attente de signature", signed: "Signé", sent: "Signé et envoyé" } as const;

// Mandat automatique : questionnaire -> mandat généré -> validé par l'agent -> signé par le mandant -> envoyé.
export function MandatePanel({ pr, me }: { pr: Project; me: Participant }) {
  const { mutate } = useDemo();
  const [signName, setSignName] = useState(me.name);
  const [agree, setAgree] = useState(false);
  const owners = pr.participants.filter((p) => sideOf(p) === "sale");
  const admin = pr.participants.find((p) => p.isAdmin)!;

  const setMandate = (ownerId: string, m: Participant["mandate"], text: string) =>
    mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === ownerId ? { ...x, mandate: m } : x)) }), { who: me.name, text });
  const preview = async (o: Participant) => openPdf(await buildMandatePdf(pr, o, admin, o.mandate?.signedBy ? { by: o.mandate.signedBy, at: o.mandate.signedAt ?? new Date().toISOString(), image: o.mandate.signatureImg } : undefined));

  if (!pr.options.mandate) return <div className="kr-banner"><p>La génération du mandat n'est pas activée pour ce projet.</p></div>;
  if (!owners.length) return <div className="kr-banner"><p>Aucune partie « vente » dans ce projet : le mandat de vente est généré pour la partie vente.</p></div>;

  return (
    <div className="kr-grid">
      <h2 className="kr-title-3" style={{ margin: 0 }}>Mandat de vente</h2>
      <p className="kr-body">Les réponses du questionnaire servent à générer le mandat. L'agent le valide, le mandant le signe, puis il est envoyé.</p>
      <p className="kr-small">Signature électronique certifiée et modèle relu par un avocat : <Soon />. Dans la démonstration, la signature est simulée et le document porte la mention « démonstration ».</p>
      {owners.map((o) => {
        const m = o.mandate;
        const ready = o.submitted || questionsFor(pr, o).length === 0;
        const iAmOwner = me.id === o.id;
        return (
          <section key={o.id} className="kr-card">
            <p className="kr-card__ref">Mandant</p><h3 className="kr-title-3">{o.name}</h3>
            <p className="kr-small">{m ? STATUS[m.status] : ready ? "Questionnaire reçu : le mandat peut être généré" : "En attente du questionnaire"}</p>
            {m?.signedAt && <p className="kr-small">Signé par {m.signedBy} le {new Date(m.signedAt).toLocaleString("fr-FR")}</p>}
            {m?.sentAt && <p className="kr-small">Envoyé le {new Date(m.sentAt).toLocaleString("fr-FR")} aux parties, par signature électronique (simulation).</p>}

            {me.isAdmin && !m && <button type="button" className="kr-btn kr-btn--primary" disabled={!ready} onClick={() => setMandate(o.id, { status: "draft" }, `Mandat généré pour ${o.name}`)}>Générer le mandat</button>}
            {m && <button type="button" className="kr-btn kr-btn--outline" onClick={() => preview(o)}>Ouvrir le mandat (PDF)</button>}
            {me.isAdmin && m?.status === "draft" && <button type="button" className="kr-btn kr-btn--primary" onClick={() => setMandate(o.id, { status: "validated" }, `Mandat validé par l'agent (${o.name})`)}>Valider le mandat</button>}
            {iAmOwner && m?.status === "validated" && (
              <form className="kr-form" onSubmit={(e) => { e.preventDefault(); if (!agree || !signName.trim()) return; setMandate(o.id, { status: "signed", signedBy: signName.trim(), signedAt: new Date().toISOString() }, `Mandat signé par ${signName.trim()}`); }}>
                <div className="kr-field"><label htmlFor="sg">Tapez votre nom pour signer</label><input id="sg" className="kr-input" value={signName} onChange={(e) => setSignName(e.target.value)} /></div>
                <label className="kr-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>Je souhaite signer ce mandat.</span></label>
                <button type="submit" className="kr-btn kr-btn--primary" disabled={!agree}>Signer le mandat</button>
              </form>
            )}
            {!iAmOwner && m?.status === "validated" && me.isAdmin && <p className="kr-hint">En attente de la signature de {o.name}. Utilisez « Agir en tant que » pour signer à sa place dans la démonstration.</p>}
            {me.isAdmin && m?.status === "signed" && <button type="button" className="kr-btn kr-btn--primary" onClick={() => setMandate(o.id, { ...m, status: "sent", sentAt: new Date().toISOString() }, `Mandat envoyé automatiquement (${o.name})`)}>Envoyer le mandat signé</button>}
          </section>
        );
      })}
    </div>
  );
}
