"use client";

import { useCallback, useEffect, useState } from "react";
import { isLang, type Lang } from "@/lib/formdef";

const KEY = "kr-form-lang";

// Langue des pages publiques : lien (?lang) > choix mémorisé > langue du navigateur (fr, sinon anglais).
// Le choix est mémorisé sans jamais bloquer la page si le navigateur refuse le stockage.
export function useFormLang(initialLang: Lang, explicit: boolean) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    let next: Lang | null = explicit ? initialLang : null;
    if (!next) { try { const s = localStorage.getItem(KEY); if (isLang(s)) next = s; } catch { /* sans mémoire */ } }
    if (!next) next = (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en";
    setLang(next);
  }, [explicit, initialLang]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const choose = useCallback((l: Lang) => {
    setLang(l);
    try { localStorage.setItem(KEY, l); } catch { /* sans mémoire */ }
  }, []);

  return { lang, choose };
}
