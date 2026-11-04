"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blocksFor, isVisible, progress, type Answers, type Question, type Role } from "@/lib/questionnaire";
import { UI, tx, type Lang } from "@/lib/i18n";

export type SubmitResult = { ok: boolean; message?: string; errors?: Record<string, string>; detail?: string };
export type SubmitMeta = { hp: string; elapsed: number };

// Même formulaire pour l'espace connecté (français) et pour les liens publics (français ou anglais).
export function QuestionnaireForm({ role, lang = "fr", submit, submitLabel, successNode }: {
  role: Role;
  lang?: Lang;
  submit: (answers: Answers, meta: SubmitMeta) => Promise<SubmitResult>;
  submitLabel?: string;
  successNode?: React.ReactNode;
}) {
  const router = useRouter();
  const t = UI[lang];
  const blocks = useMemo(() => blocksFor(role), [role]);
  const startedAt = useRef(Date.now());
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [hp, setHp] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const { done, total } = progress(role, answers);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const set = (id: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => { if (!e[id]) return e; const { [id]: _, ...rest } = e; return rest; });
  };
  const toggle = (q: Question & { type: "multi" }, option: string) => {
    const cur = (answers[q.id] as string[] | undefined) ?? [];
    set(q.id, cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option]);
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setDetail(null);
    start(async () => {
      let res: SubmitResult;
      try {
        res = await submit(answers, { hp, elapsed: Date.now() - startedAt.current });
      } catch {
        res = { ok: false, message: t.fail };
      }
      if (res.ok) {
        if (successNode) { setSent(true); window.scrollTo({ top: 0 }); return; }
        router.refresh(); window.scrollTo({ top: 0 }); return;
      }
      setErrors(res.errors ?? {});
      setMessage(res.message ?? t.fail);
      setDetail(res.detail ?? null);
      const first = res.errors && Object.keys(res.errors)[0];
      if (first) document.getElementById(`q-${first}`)?.scrollIntoView({ block: "center" });
    });
  }

  if (sent && successNode) return <>{successNode}</>;

  return (
    <form onSubmit={onSubmit} noValidate lang={lang}>
      <div className="kr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={t.progressLabel}>
        <div className="kr-progress__bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="kr-small kr-progress__text">{t.progress(done, total)}</p>

      {/* Piège à robots : invisible pour une personne, rempli par les scripts. */}
      <div className="kr-hp" aria-hidden="true">
        <label>Website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>

      {blocks.map((b) => (
        <section key={b.id} className="kr-qblock" aria-labelledby={`b-${b.id}`}>
          <h2 id={`b-${b.id}`} className="kr-title-3">{tx(lang, b.title)}</h2>
          {b.intro && <p className="kr-small">{tx(lang, b.intro)}</p>}
          {b.questions.filter((q) => isVisible(q, answers)).map((q) => {
            const err = errors[q.id];
            const label = <>{tx(lang, q.label)}{q.required && <span className="kr-req"> {t.required}</span>}</>;
            const hint = q.hint ? tx(lang, q.hint) : null;
            if (q.type === "text" || q.type === "longtext") {
              return (
                <div key={q.id} id={`q-${q.id}`} className="kr-field">
                  <label htmlFor={`f-${q.id}`}>{label}</label>
                  {q.type === "longtext"
                    ? <textarea id={`f-${q.id}`} className="kr-input kr-textarea" rows={4} maxLength={2000}
                        value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />
                    : <input id={`f-${q.id}`} className="kr-input" type={q.id === "email" ? "email" : "text"}
                        inputMode={q.id === "email" ? "email" : q.id === "telephone" ? "tel" : undefined}
                        autoComplete={q.id === "email" ? "email" : q.id === "telephone" ? "tel" : "off"} maxLength={500}
                        value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)}
                        aria-invalid={err ? true : undefined} />}
                  {hint && <p className="kr-hint">{hint}</p>}
                  {err && <p className="kr-error" role="alert">{err}</p>}
                </div>
              );
            }
            const multi = q.type === "multi";
            return (
              <fieldset key={q.id} id={`q-${q.id}`} className="kr-fieldset">
                <legend>{label}</legend>
                {multi && <p className="kr-hint">{t.multi}</p>}
                <div className="kr-chips">
                  {q.options.map((o) => {
                    const checked = multi ? ((answers[q.id] as string[] | undefined) ?? []).includes(o) : answers[q.id] === o;
                    return (
                      <label key={o} className="kr-chip">
                        <input type={multi ? "checkbox" : "radio"} name={q.id} checked={checked}
                          onChange={() => (multi ? toggle(q as Question & { type: "multi" }, o) : set(q.id, o))} />
                        <span>{tx(lang, o)}</span>
                      </label>
                    );
                  })}
                </div>
                {err && <p className="kr-error" role="alert">{err}</p>}
              </fieldset>
            );
          })}
        </section>
      ))}

      {message && <p className="kr-error" role="alert">{message}</p>}
      {message && detail && <p className="kr-hint">{t.techCode} {detail}</p>}
      <div className="kr-sticky">
        <button type="submit" className="kr-btn kr-btn--primary" disabled={pending}>
          {pending ? t.sending : submitLabel ?? t.submit}
        </button>
      </div>
    </form>
  );
}
