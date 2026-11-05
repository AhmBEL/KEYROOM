import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";
import { pickLang } from "@/lib/formlang";
import { LEGAL, legalComplete, legalSections } from "@/lib/legal";

// Indexable seulement une fois les informations complétées.
export const metadata: Metadata = {
  title: "Mentions légales — Keyroom",
  robots: legalComplete() ? { index: true, follow: true } : { index: false, follow: false },
};

export default async function MentionsLegalesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang, explicit } = await pickLang((await searchParams).lang);
  return <LegalDoc initialLang={lang} explicit={explicit} sections={legalSections()} updated={LEGAL.updated} />;
}
