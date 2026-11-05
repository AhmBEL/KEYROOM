import Link from "next/link";
import type { Lang } from "@/lib/formdef";
import { legalPublishable } from "@/lib/legal";

// Lien vers les mentions légales, publié quand le texte est complet ou provisoire.
export function LegalFooter({ lang }: { lang: Lang }) {
  if (!legalPublishable()) return null;
  return (
    <footer className="kr-legal-footer">
      <Link href={`/mentions-legales?lang=${lang}`}>{lang === "fr" ? "Mentions légales" : "Legal notice"}</Link>
    </footer>
  );
}
