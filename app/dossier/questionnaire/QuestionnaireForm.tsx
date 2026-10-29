"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blocksFor, isVisible, progress, type Answers, type Question, type Role } from "@/lib/questionnaire";
import { submitQuestionnaire } from "./actions";

export function QuestionnaireForm({ role }: { role: Role }) {
  const router = useRouter();
  const blocks = useMemo(() => blocksFor(role), [role]);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await submitQuestionnaire(answers);
      if (res.ok) { router.refresh(); window.scrollTo({ top: 0 }); return; }
      setErrors(res.errors ?? {});
      setMessage(res.message ?? "L'envoi a échoué. Réessayez.");
      const first = res.errors && Object.keys(res.errors)[0];
      if (first) document.getElementById(`q-${first}`)?.scrollIntoView({ block: "center" });
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="kr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
        aria-label="Progression du questionnaire">
        <div className="kr-progress__bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="kr-small kr-progress__text">{done} réponse{done > 1 ? "s" : ""} obligatoire{done > 1 ? "s" : ""} sur {total}</p>

      {blocks.map((b) => (
        <section key={b.id} className="kr-qblock" aria-labelledby={`b-${b.id}`}>
          <h2 id={`b-${b.id}`} className="kr-title-3">{b.title}</h2>
          {b.intro && <p className="kr-small">{b.intro}</p>}
          {b.questions.filter((q) => isVisible(q, answers)).map((q) => {
            const err = errors[q.id];
            const label = <>{q.label}{q.required && <span className="kr-req"> (obligatoire)</span>}</>;
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
                  {q.hint && <p className="kr-hint">{q.hint}</p>}
                  {err && <p className="kr-error" role="alert">{err}</p>}
                </div>
              );
            }
            const multi = q.type === "multi";
            return (
              <fieldset key={q.id} id={`q-${q.id}`} className="kr-fieldset">
                <legend>{label}</legend>
                {multi && <p className="kr-hint">Plusieurs choix possibles.</p>}
                <div className="kr-chips">
                  {q.options.map((o) => {
                    const checked = multi ? ((answers[q.id] as string[] | undefined) ?? []).includes(o) : answers[q.id] === o;
                    return (
                      <label key={o} className="kr-chip">
                        <input type={multi ? "checkbox" : "radio"} name={q.id} checked={checked}
                          onChange={() => (multi ? toggle(q as Question & { type: "multi" }, o) : set(q.id, o))} />
                        <span>{o}</span>
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
      <div className="kr-sticky">
        <button type="submit" className="kr-btn kr-btn--primary" disabled={pending}>
          {pending ? "Envoi…" : "Valider mes réponses"}
        </button>
      </div>
    </form>
  );
}
