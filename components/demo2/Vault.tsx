"use client";

import { Icon } from "./Icon";
import { Ring, useToast } from "./ui";
import { ROLES } from "@/lib/demo/catalog";
import { docProgress, docsFor, isParty } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { Participant, Project } from "@/lib/demo/types";

// Le coffre : une carte par document, ajout par fichier ou par photo, état d'avancement bien visible.
export function Vault({ pr, me, name }: { pr: Project; me: Participant; name: (p: Participant) => string }) {
  const { mutate } = useDemo();
  const toast = useToast();
  const list = docsFor(pr, me); const dp = docProgress(pr, me);
  const todo = list.filter((d) => !me.docs[d.id]); const done = list.filter((d) => me.docs[d.id]);
  const others = pr.participants.filter((p) => p.id !== me.id && isParty(p));

  const put = (id: string, label: string, file: File | undefined) => {
    if (!file) return;
    mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => (x.id === me.id ? { ...x, docs: { ...x.docs, [id]: { name: file.name, size: file.size, at: new Date().toISOString() } } } : x)) }), { who: me.name, text: `A déposé un document : ${label}` });
    toast("Document ajouté à votre coffre");
  };
  const remove = (id: string, label: string) => mutate(pr.id, (p) => ({ ...p, participants: p.participants.map((x) => { if (x.id !== me.id) return x; const { [id]: _, ...rest } = x.docs; return { ...x, docs: rest }; }) }), { who: me.name, text: `A retiré un document : ${label}` });

  const card = (d: (typeof list)[number]) => {
    const f = me.docs[d.id];
    return (
      <div key={d.id} className={`kr2-vault-doc${f ? " is-done" : ""}`}>
        <div className="kr2-between"><h3>{d.label}</h3><span className={`kr2-chip ${f ? "kr2-chip--ok" : ""}`}>{f ? "Déposé" : d.required ? "Obligatoire" : "Facultatif"}</span></div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", color: "var(--text-muted)" }}><Icon name="lock" size={14} /> Visible par vous{d.adminAccess ? " et l'administrateur" : " seul"}</p>
        {f ? (
          <div className="kr2-between"><span style={{ fontSize: 15 }}><Icon name="file" size={16} /> {f.name}</span><button type="button" className="kr2-back" onClick={() => remove(d.id, d.label)} aria-label={`Retirer ${d.label}`}>Retirer</button></div>
        ) : (
          <div className="kr2-row kr2-row--wrap">
            <label className="kr2-file-btn"><Icon name="upload" size={18} />Choisir un fichier<input type="file" aria-label={`Choisir un fichier pour ${d.label}`} onChange={(e) => put(d.id, d.label, e.target.files?.[0])} /></label>
            <label className="kr2-file-btn"><Icon name="camera" size={18} />Prendre une photo<input type="file" accept="image/*" capture="environment" aria-label={`Prendre une photo pour ${d.label}`} onChange={(e) => put(d.id, d.label, e.target.files?.[0])} /></label>
          </div>
        )}
        {d.soon && !f && <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{d.soon} · <span className="kr2-chip kr2-chip--wait">Bientôt disponible</span></p>}
      </div>
    );
  };

  return (
    <div className="kr2-grid">
      <div className="kr2-card">
        <div className="kr2-row"><Ring value={dp.total ? dp.done / dp.total : 1} size={64} /><div><p className="kr2-eyebrow">Mon coffre</p><p style={{ margin: 0, fontSize: 16 }}>{dp.total ? `${dp.done} sur ${dp.total} documents obligatoires` : "Aucun document obligatoire"}</p></div></div>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Vos documents sont privés. Personne ne peut les consulter avant l'étape prévue, ni savoir lesquels vous avez déposés : chacun voit seulement si votre dossier est complet. Démonstration : seul le nom du fichier est conservé.</p>
      </div>
      {dp.total > 0 && dp.complete && (
        <div className="kr2-reveal"><span className="kr2-reveal__ico"><Icon name="check" size={30} /></span><h2 className="kr-title-3" style={{ margin: 0 }}>Votre coffre est complet</h2><p>Les autres parties voient « documents complets », sans le contenu.</p></div>
      )}
      {list.length === 0 && <div className="kr-banner"><p>Aucun document n'est demandé pour votre rôle.</p></div>}
      {todo.length > 0 && <><h2 className="kr-title-3" style={{ margin: 0 }}>À déposer</h2>{todo.map(card)}</>}
      {done.length > 0 && <><h2 className="kr-title-3" style={{ margin: 0 }}>Déjà déposés</h2>{done.map(card)}</>}
      <h2 className="kr-title-3" style={{ margin: 0 }}>Documents des autres parties</h2>
      {!pr.revealed.documents ? (
        <div className="kr2-card"><p><Icon name="lock" size={16} /> Ils ne sont pas encore révélés. Ils le seront à l'étape prévue, avec l'accord des parties.</p></div>
      ) : others.map((p) => (
        <div key={p.id} className="kr2-card"><p className="kr2-eyebrow">{ROLES[p.role].label}</p><h2>{name(p)}</h2>
          {docsFor(pr, p).map((d) => <div key={d.id} className="kr-doc-line"><span>{d.label}</span><span className={`kr2-chip ${p.docs[d.id] ? "kr2-chip--ok" : ""}`}>{p.docs[d.id]?.name ?? "Non déposé"}</span></div>)}</div>
      ))}
    </div>
  );
}
