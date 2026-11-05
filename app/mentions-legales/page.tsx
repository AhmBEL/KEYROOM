import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";
import { pickLang } from "@/lib/formlang";
import { LEGAL, legalComplete, legalSections, type LegalConfig } from "@/lib/legal";

// Indexable seulement une fois toutes les informations saisies (le texte provisoire n'est pas indexé).
export const metadata: Metadata = {
  title: "Mentions légales — Keyroom",
  robots: legalComplete() ? { index: true, follow: true } : { index: false, follow: false },
};

export default async function MentionsLegalesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang, explicit } = await pickLang((await searchParams).lang);
  // L'adresse de contact déjà publiée sur la page d'accueil sert de contact tant que celle de l'éditeur n'est pas saisie.
  const cfg: LegalConfig = { ...LEGAL, email: LEGAL.email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "" };
  return <LegalDoc initialLang={lang} explicit={explicit} sections={legalSections(cfg)} updated={LEGAL.updated} provisional={!legalComplete(cfg)} contact={cfg.email} />;
}
