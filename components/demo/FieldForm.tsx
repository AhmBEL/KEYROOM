"use client";

import { useState } from "react";
import type { Question } from "@/lib/demo/types";

// Questionnaire d'un participant : texte libre ou pastilles de choix, champs obligatoires contrôlés.
export function FieldForm({ questions, initial, onSubmit, submitLabel = "Envoyer mes réponses" }: {
  questions: Question[]; initial: Record<string, string>; onSubmit: (a: Record<string, string>) => void; submitLabel?: string;
}) {
  const [a, setA] = useState<Record<string, string>>(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  return (
    <form className="kr-form" noValidate onSubmit={(e) => {
      e.preventDefault();
      const errors: Record<string, string> = {};
      for (const q of questions) if (q.required && !(a[q.id] ?? "").trim()) errors[q.id] = "Cette réponse est requise.";
      setErr(errors);
      if (!Object.keys(errors).length) onSubmit(a);
    }}>
      {questions.map((q) => q.type === "single" ? (
        <fieldset key={q.id} className="kr-fieldset"><legend>{q.label}{q.required && <span className="kr-req"> (obligatoire)</span>}</legend>
          <div className="kr-chips">{q.options?.map((o) => (
            <label key={o} className="kr-chip"><input type="radio" name={q.id} checked={a[q.id] === o} onChange={() => setA({ ...a, [q.id]: o })} /><span>{o}</span></label>
          ))}</div>
          {err[q.id] && <p className="kr-error" role="alert">{err[q.id]}</p>}
        </fieldset>
      ) : (
        <div key={q.id} className="kr-field"><label htmlFor={`f-${q.id}`}>{q.label}{q.required && <span className="kr-req"> (obligatoire)</span>}</label>
          <input id={`f-${q.id}`} className="kr-input" value={a[q.id] ?? ""} onChange={(e) => setA({ ...a, [q.id]: e.target.value })} aria-invalid={err[q.id] ? true : undefined} />
          {err[q.id] && <p className="kr-error" role="alert">{err[q.id]}</p>}</div>
      ))}
      <button type="submit" className="kr-btn kr-btn--primary">{submitLabel}</button>
    </form>
  );
}
