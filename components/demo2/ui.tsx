"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

// ---------- Anneau de progression
export function Ring({ value, size = 64, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, value));
  return (
    <span className="kr2-ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct * 100)} %`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="kr2-ring__arc" />
      </svg>
      <span className="kr2-ring__n" aria-hidden="true">{Math.round(pct * 100)}<small>%</small></span>
    </span>
  );
}

// ---------- Avatar à initiales, avec un petit statut
export function Avatar({ name, status, size = 44 }: { name: string; status?: "ok" | "wait" | "none"; size?: number }) {
  const ini = name.replace(/\(.*\)/, "").split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span className={`kr2-avatar${status ? ` kr2-avatar--${status}` : ""}`} style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">
      {ini}{status && status !== "none" && <i className="kr2-avatar__dot">{status === "ok" ? <Icon name="check" size={10} /> : null}</i>}
    </span>
  );
}

// ---------- Tuile à toucher (choix unique ou action)
export function Tile({ icon, title, text, selected, onClick, as = "button", right, disabled }: {
  icon?: IconName; title: string; text?: string; selected?: boolean; onClick?: () => void; as?: "button" | "div"; right?: React.ReactNode; disabled?: boolean;
}) {
  const body = (
    <>
      {icon && <span className="kr2-tile__icon"><Icon name={icon} size={22} /></span>}
      <span className="kr2-tile__txt"><strong>{title}</strong>{text && <span>{text}</span>}</span>
      <span className="kr2-tile__right">{right ?? (selected ? <Icon name="check" size={20} /> : null)}</span>
    </>
  );
  return as === "div" ? <div className={`kr2-tile${selected ? " is-on" : ""}`}>{body}</div>
    : <button type="button" className={`kr2-tile${selected ? " is-on" : ""}`} aria-pressed={selected} onClick={onClick} disabled={disabled}>{body}</button>;
}

// ---------- Écran d'une conversation : retour, progression, titre
export function Screen({ step, total, title, help, onBack, children }: { step?: number; total?: number; title: string; help?: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <section className="kr2-screen">
      {(onBack || total) && (
        <div className="kr2-screen__top">
          {onBack ? <button type="button" className="kr2-back" onClick={onBack} aria-label="Retour"><Icon name="arrow-left" size={20} /><span>Retour</span></button> : <span />}
          {total ? <span className="kr2-screen__count">{step} / {total}</span> : null}
        </div>
      )}
      {total ? <div className="kr2-bar" aria-hidden="true"><i style={{ width: `${((step ?? 0) / total) * 100}%` }} /></div> : null}
      <h1 className="kr2-title">{title}</h1>
      {help && <p className="kr2-help">{help}</p>}
      {children}
    </section>
  );
}

// ---------- Motif de l'arche (charte) avec icône
export function Arch({ icon, size = 150 }: { icon: IconName; size?: number }) {
  return (
    <span className="kr2-arch" style={{ width: size, height: size * 1.25 }} aria-hidden="true"><span className="kr2-arch__in"><Icon name={icon} size={size * 0.32} /></span></span>
  );
}

// ---------- Messages courts (confirmations)
type ToastApi = (text: string) => void;
const ToastCtx = createContext<ToastApi>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback<ToastApi>((text) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text });
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="kr2-toast-zone" role="status" aria-live="polite">{msg && <div key={msg.id} className="kr2-toast"><Icon name="check" size={18} />{msg.text}</div>}</div>
    </ToastCtx.Provider>
  );
}

// ---------- Panneau qui monte du bas (formulaires courts)
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal(); else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="kr2-sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label={title}>
      <div className="kr2-sheet__in">
        <div className="kr2-sheet__head"><h2 className="kr-title-3" style={{ margin: 0 }}>{title}</h2><button type="button" className="kr2-back" onClick={onClose} aria-label="Fermer"><Icon name="x" size={20} /></button></div>
        {open && children}
      </div>
    </dialog>
  );
}

// ---------- Segments de parcours
export function Journey({ groups }: { groups: { done: boolean; current: boolean; label: string }[] }) {
  return (
    <div className="kr2-journey" role="img" aria-label={`Parcours : ${groups.filter((g) => g.done).length} étapes sur ${groups.length} terminées`}>
      {groups.map((g, i) => <i key={i} className={g.done ? "is-done" : g.current ? "is-current" : ""} title={g.label} />)}
    </div>
  );
}
