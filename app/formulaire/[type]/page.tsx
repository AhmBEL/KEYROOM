import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";
import { pickLang } from "@/lib/formlang";
import { UI } from "@/lib/i18n";
import { submitPublicForm } from "../actions";

type Props = { params: Promise<{ type: string }>; searchParams: Promise<{ lang?: string }> };
const ROLE = { mandat: "partie_mandat", investisseurs: "partie_investisseurs" } as const;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { type } = await params;
  const lang = await pickLang((await searchParams).lang);
  const t = UI[lang];
  return { title: `${type === "mandat" ? t.formMandat : t.formInvest} — Keyroom`, robots: { index: false, follow: false } };
}

export default async function PublicFormPage({ params, searchParams }: Props) {
  const { type } = await params;
  if (type !== "mandat" && type !== "investisseurs") notFound();
  const lang = await pickLang((await searchParams).lang);
  const t = UI[lang];

  return (
    <main className="kr-page kr-page--has-sticky" lang={lang}>
      <div className="kr-topbar"><Logo width={160} /><LangSwitch lang={lang} path={`/formulaire/${type}`} /></div>
      <QuestionnaireForm
        header={
          <>
            <h1 className="kr-title-2">{type === "mandat" ? t.formMandat : t.formInvest}</h1>
            <p className="kr-body">{t.intro}</p>
            <p className="kr-small kr-privacy">{t.privacy}</p>
          </>
        }
        role={ROLE[type]}
        lang={lang}
        submit={submitPublicForm.bind(null, type, lang)}
        successNode={
          <div role="status">
            <h2 className="kr-title-2">{t.thanksTitle}</h2>
            <p className="kr-body">{t.thanksText}</p>
          </div>
        }
      />
    </main>
  );
}
