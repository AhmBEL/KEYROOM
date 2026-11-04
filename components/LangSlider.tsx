"use client";

import { TXT, type Lang } from "@/lib/formdef";

// Sélecteur FR / EN à deux positions, identique sur tous les questionnaires.
export function LangSlider({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="kr-seg" role="group" aria-label={`${TXT.fr.langLabel} / ${TXT.en.langLabel}`}>
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onChange(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
