import Link from "next/link";
import { UI, type Lang } from "@/lib/i18n";

export function LangSwitch({ lang, path }: { lang: Lang; path: string }) {
  const other: Lang = lang === "fr" ? "en" : "fr";
  return (
    <nav className="kr-lang" aria-label="Language / Langue">
      <Link href={`${path}?lang=${other}`} hrefLang={other} lang={other}>{UI[lang].switchTo}</Link>
    </nav>
  );
}
