"use client";

import Link from "next/link";
import { TXT, type Lang } from "@/lib/formdef";
import { LangSlider } from "./LangSlider";
import { Logo } from "./Logo";
import { useFormLang } from "./useFormLang";

// Page de choix du questionnaire, avec le même sélecteur FR / EN que les questionnaires.
export function FormIndex({ initialLang, explicit }: { initialLang: Lang; explicit: boolean }) {
  const { lang, choose } = useFormLang(initialLang, explicit);
  const t = TXT[lang];
  return (
    <main className="kr-page" lang={lang}>
      <div className="kr-topbar"><Logo width={160} /><LangSlider lang={lang} onChange={choose} /></div>
      <p className="kr-eyebrow kr-kicker">{t.kicker}</p>
      <h1 className="kr-title-2">{t.indexTitle}</h1>
      <p className="kr-body">{t.indexText}</p>
      <div className="kr-actions">
        <Link className="kr-btn kr-btn--primary" href={`/formulaire/mandat?lang=${lang}`}>{t.pickMandat}</Link>
        <Link className="kr-btn kr-btn--outline" href={`/formulaire/investisseurs?lang=${lang}`}>{t.pickInvest}</Link>
      </div>
    </main>
  );
}
