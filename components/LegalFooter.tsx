import Link from "next/link";
import type { Lang } from "@/lib/formdef";
import { legalComplete } from "@/lib/legal";

// Lien vers les mentions légales, publié seulement quand les informations de l'éditeur sont complètes.
export function LegalFooter({ lang }: { lang: Lang }) {
  if (!legalComplete()) return null;
  return (
    <footer className="kr-legal-footer">
      <Link href={`/mentions-legales?lang=${lang}`}>{lang === "fr" ? "Mentions légales" : "Legal notice"}</Link>
    </footer>
  );
}
