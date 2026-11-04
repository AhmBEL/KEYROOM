import type { Metadata } from "next";
import { FormIndex } from "@/components/FormIndex";
import { pickLang } from "@/lib/formlang";

export const metadata: Metadata = { title: "Questionnaire — Keyroom", robots: { index: false, follow: false } };

export default async function FormIndexPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang, explicit } = await pickLang((await searchParams).lang);
  return <FormIndex initialLang={lang} explicit={explicit} />;
}
