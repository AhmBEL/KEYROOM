"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  TXT, isLang, isShown, progress, recapText, sectionsFor, toStored, validateForm,
  type Answers, type Decl, type Field, type FormRole, type Lang, type Stored,
} from "@/lib/formdef";
import { ProcessFlow } from "./ProcessFlow";

export type PublicResult = { ok: boolean; message?: string; errors?: Record<string, string>; detail?: string; validatedAt?: string };
export type PublicMeta = { hp: string; elapsed: number };
const KEY = "kr-form-lang";

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function PublicForm({ role, initialLang, explicit, submit }: {
  role: FormRole;
  initialLang: Lang;
  explicit: boolean; // la langue vient du lien (?lang=…)
  submit: (lang: Lang, answers: Answers, decl: Decl, meta: PublicMeta) => Promise<PublicResult>;
}) {
  const sections = useMemo(() => sectionsFor(role), [role]);
  const startedAt = useRef(Date.now());
  const [lang, setLang] = useState<Lang>(initialLang);
  const [answers, setAnswers] = useState<Answers>({});
  const [decl, setDecl] = useState<Decl>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [hp, setHp] = useState("");
  const [sent, setSent] = useState<Stored | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const t = TXT[lang];

  // Langue : lien (?lang) > choix mémorisé > langue du navigateur (fr, sinon anglais).
  useEffect(() => {
    let next: Lang | null = explicit ? initialLang : null;
    if (!next) { try { const s = localStorage.getItem(KEY); if (isLang(s)) next = s; } catch { /* sans mémoire */ } }
    if (!next) next = (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en";
    setLang(next);
  }, [explicit, initialLang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const choose = (l: Lang) => {
    setLang(l); setCopied(false); setErrors({}); setMessage(null); setDetail(null);
    try { localStorage.setItem(KEY, l); } catch { /* sans mémoire */ }
  };
  const setAnswer = (id: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => { if (!e[id]) return e; const { [id]: _, ...rest } = e; return rest; });
  };
  const toggleMulti = (id: string, optionId: string) => {
    const cur = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    setAnswer(id, cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId]);
  };
  const { done, total } = progress(role, answers, decl);
  const pct = total ? Math.round((done / total) * 100) : 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null); setDetail(null);
    start(async () => {
      let res: PublicResult;
      try { res = await submit(lang, answers, decl, { hp, elapsed: Date.now() - startedAt.current }); }
      catch { res = { ok: false, message: t.fail }; }
      if (res.ok) {
        const clean = validateForm(role, lang, answers, decl).answers;
        setSent(toStored(role, lang, clean, res.validatedAt ?? new Date().toISOString()));
        window.scrollTo({ top: 0 });
        return;
      }
      setErrors(res.errors ?? {});
      setMessage(res.message ?? t.fail);
      setDetail(res.detail ?? null);
      const first = res.errors && Object.keys(res.errors)[0];
      if (first) document.getElementById(`q-${first}`)?.scrollIntoView({ block: "center" });
    });
  }

  // Récapitulatif de secours : possible dès que les réponses sont valides.
  const fallback = useMemo(() => {
    const v = validateForm(role, lang, answers, decl);
    return Object.keys(v.errors).length ? null : recapText(toStored(role, lang, v.answers, new Date().toISOString()), lang);
  }, [role, lang, answers, decl]);

  const LangSlider = (
    <div className="kr-seg" role="group" aria-label={`${TXT.fr.langLabel} / ${TXT.en.langLabel}`}>
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => choose(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );

  const title = role === "mandat" ? t.titleMandat : t.titleInvest;

  if (sent) {
    const text = recapText(sent, lang);
    return (
      <div lang={lang}>
        <div className="kr-bar"><div className="kr-bar__row kr-bar__row--end">{LangSlider}</div></div>
        <div role="status">
          <h1 className="kr-title-2">{t.thanksTitle}</h1>
          <p className="kr-body">{t.thanksText}</p>
        </div>
        <h2 className="kr-title-3">{t.recapTitle}</h2>
        <pre className="kr-recap-text">{text}</pre>
        <button type="button" className="kr-btn kr-btn--outline" onClick={async () => setCopied(await copyText(text))}>{t.copy}</button>
        {copied && <p className="kr-success" role="status">{t.copied}</p>}

        {/* Fin de parcours, bien visible : la démarche est terminée, la page peut être fermée. */}
        <section className="kr-done" aria-labelledby="done-title">
          <span className="kr-done__badge" aria-hidden="true">✓</span>
          <h2 id="done-title" className="kr-title-2">{t.doneTitle}</h2>
          <p className="kr-body">{t.doneText}</p>
        </section>
      </div>
    );
  }

  const renderField = (f: Field) => {
    if (!isShown(f, answers)) return null;
    if (f.kind === "note") return <div key={f.id} className="kr-note" role="note">{f.text[lang]}</div>;
    if (f.kind === "flow") return <ProcessFlow key={f.id} lang={lang} />;
    const err = errors[f.id];
    const label = <>{f.label[lang]}{f.required && <span className="kr-req"> {t.required}</span>}</>;
    if (f.kind === "single") {
      return (
        <fieldset key={f.id} id={`q-${f.id}`} className="kr-fieldset">
          <legend>{label}</legend>
          <div className="kr-chips">
            {f.options.map((opt) => (
              <label key={opt.id} className="kr-chip">
                <input type="radio" name={f.id} value={opt.id} checked={answers[f.id] === opt.id} onChange={() => setAnswer(f.id, opt.id)} />
                <span>{opt.label[lang]}</span>
              </label>
            ))}
          </div>
          {err && <p className="kr-error" role="alert">{err}</p>}
        </fieldset>
      );
    }
    if (f.kind === "multi") {
      const picked = Array.isArray(answers[f.id]) ? (answers[f.id] as string[]) : [];
      return (
        <fieldset key={f.id} id={`q-${f.id}`} className="kr-fieldset">
          <legend>{label}</legend>
          <p className="kr-hint">{t.multi}</p>
          <div className="kr-chips">
            {f.options.map((opt) => (
              <label key={opt.id} className="kr-chip">
                <input type="checkbox" name={f.id} value={opt.id} checked={picked.includes(opt.id)} onChange={() => toggleMulti(f.id, opt.id)} />
                <span>{opt.label[lang]}</span>
              </label>
            ))}
          </div>
          {err && <p className="kr-error" role="alert">{err}</p>}
        </fieldset>
      );
    }
    const help = f.help ? <p id={`h-${f.id}`} className="kr-hint">{f.help[lang]}</p> : null;
    return (
      <div key={f.id} id={`q-${f.id}`} className="kr-field">
        <label htmlFor={`f-${f.id}`}>{label}</label>
        {f.kind === "longtext" ? (
          <textarea id={`f-${f.id}`} className="kr-input kr-textarea" rows={4} maxLength={2000} value={answers[f.id] ?? ""}
            onChange={(e) => setAnswer(f.id, e.target.value)} aria-describedby={help ? `h-${f.id}` : undefined} />
        ) : (
          <input id={`f-${f.id}`} className="kr-input" type={f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : "text"}
            inputMode={f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : undefined} autoComplete={f.ac ?? "off"} maxLength={500}
            value={(answers[f.id] as string) ?? ""} onChange={(e) => setAnswer(f.id, e.target.value)}
            aria-invalid={err ? true : undefined} aria-describedby={help ? `h-${f.id}` : undefined} />
        )}
        {help}
        {err && <p className="kr-error" role="alert">{err}</p>}
      </div>
    );
  };

  return (
    <div lang={lang}>
      <div className="kr-bar">
        <div className="kr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={t.progressLabel}>
          <div className="kr-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="kr-bar__row"><span className="kr-small">{t.progress(done, total)}</span>{LangSlider}</div>
      </div>

      <p className="kr-eyebrow kr-kicker">{t.kicker}</p>
      <h1 className="kr-title-2">{title}</h1>
      <p className="kr-body">{t.intro}</p>
      <div className="kr-note" role="note">{t.notice}</div>

      <form onSubmit={onSubmit} noValidate>
        <div className="kr-hp" aria-hidden="true">
          <label>Website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
        </div>

        {sections.map((s) => (
          <section key={s.id} className="kr-qblock" aria-labelledby={`s-${s.id}`}>
            <h2 id={`s-${s.id}`} className="kr-title-3">{s.title[lang]}</h2>
            <p className="kr-small">{s.intro[lang]}</p>
            {s.fields.map(renderField)}
            {s.checks && (
              <fieldset id="q-declarations" className="kr-fieldset">
                <legend>{s.checksLabel![lang]}</legend>
                {s.checks.map((c) => (
                  <label key={c.id} className="kr-check">
                    <input type="checkbox" checked={Boolean(decl[c.id])}
                      onChange={(e) => { setDecl((d) => ({ ...d, [c.id]: e.target.checked })); setErrors((x) => { const { declarations: _, ...rest } = x; return rest; }); }} />
                    <span>{c.label[lang]}</span>
                  </label>
                ))}
                {errors.declarations && <p className="kr-error" role="alert">{errors.declarations}</p>}
              </fieldset>
            )}
          </section>
        ))}

        {message && <p className="kr-error" role="alert">{message}</p>}
        {message && detail && <p className="kr-hint">{t.techCode} {detail}</p>}
        {message && fallback && (
          <>
            <button type="button" className="kr-btn kr-btn--outline" onClick={async () => setCopied(await copyText(fallback))}>{t.copy}</button>
            {copied && <p className="kr-success" role="status">{t.copied}</p>}
          </>
        )}
        <div className="kr-sticky">
          <button type="submit" className="kr-btn kr-btn--primary" disabled={pending}>{pending ? t.sending : t.submit}</button>
        </div>
      </form>
    </div>
  );
}
