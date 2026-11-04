import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PublicForm } from "@/components/PublicForm";
import { pickLang } from "@/lib/formlang";
import { TXT, isFormRole } from "@/lib/formdef";
import { submitPublicForm } from "../actions";

type Props = { params: Promise<{ type: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { type } = await params;
  const { lang } = await pickLang((await searchParams).lang);
  const t = TXT[lang];
  return { title: `${type === "mandat" ? t.titleMandat : t.titleInvest} — Keyroom`, robots: { index: false, follow: false } };
}

export default async function PublicFormPage({ params, searchParams }: Props) {
  const { type } = await params;
  if (!isFormRole(type)) notFound();
  const { lang, explicit } = await pickLang((await searchParams).lang);

  return (
    <main className="kr-page kr-page--has-sticky" lang={lang}>
      <Logo width={160} />
      <PublicForm role={type} initialLang={lang} explicit={explicit} submit={submitPublicForm.bind(null, type)} />
    </main>
  );
}
