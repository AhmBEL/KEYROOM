import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { pickLang } from "@/lib/formlang";
import { UI } from "@/lib/i18n";

export const metadata: Metadata = { title: "Questionnaire — Keyroom", robots: { index: false, follow: false } };

export default async function FormIndex({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = await pickLang((await searchParams).lang);
  const t = UI[lang];
  return (
    <main className="kr-page" lang={lang}>
      <div className="kr-topbar"><Logo width={160} /><LangSwitch lang={lang} path="/formulaire" /></div>
      <h1 className="kr-title-2">{t.indexTitle}</h1>
      <p className="kr-body">{t.indexText}</p>
      <div className="kr-actions">
        <Link className="kr-btn kr-btn--primary" href={`/formulaire/mandat?lang=${lang}`}>{t.pickMandat}</Link>
        <Link className="kr-btn kr-btn--outline" href={`/formulaire/investisseurs?lang=${lang}`}>{t.pickInvest}</Link>
      </div>
    </main>
  );
}
