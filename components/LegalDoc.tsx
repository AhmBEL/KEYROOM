"use client";

import { Fragment } from "react";
import { TXT, type Lang } from "@/lib/formdef";
import { TODO_RE, type LegalSection } from "@/lib/legal";
import { LangSlider } from "./LangSlider";
import { Logo } from "./Logo";
import { useFormLang } from "./useFormLang";
import Link from "next/link";

// Les repères « [à compléter] » ressortent visuellement tant que les informations manquent.
const render = (text: string) =>
  text.split(TODO_RE).map((part, i) => (TODO_RE.test(part) ? <mark key={i} className="kr-todo-mark">{part}</mark> : <Fragment key={i}>{part}</Fragment>));

export function LegalDoc({ initialLang, explicit, sections, updated, provisional, contact }: { initialLang: Lang; explicit: boolean; sections: LegalSection[]; updated: string; provisional: boolean; contact: string }) {
  const { lang, choose } = useFormLang(initialLang, explicit);
  const t = TXT[lang];
  const date = new Date(updated).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long", timeZone: "UTC" });
  return (
    <main className="kr-page" lang={lang}>
      <div className="kr-topbar"><Logo width={160} /><LangSlider lang={lang} onChange={choose} /></div>
      <h1 className="kr-title-2">{lang === "fr" ? "Mentions légales" : "Legal notice"}</h1>
      {provisional && (
        <div className="kr-note" role="note">
          {lang === "fr"
            ? `Certaines informations sont en cours de finalisation. Les mentions définitives seront publiées prochainement.${contact ? ` Pour toute question : ${contact}.` : ""}`
            : `Some information is being finalised. The final legal notice will be published shortly.${contact ? ` For any question: ${contact}.` : ""}`}
        </div>
      )}
      {sections.map((s) => (
        <section key={s.id} aria-labelledby={`l-${s.id}`} className="kr-prose">
          <h2 id={`l-${s.id}`} className="kr-title-3">{s.title[lang]}</h2>
          {s.paragraphs.map((p, i) => <p key={i} className="kr-body">{render(p[lang])}</p>)}
        </section>
      ))}
      <p className="kr-small">{lang === "fr" ? `Dernière mise à jour : ${date}.` : `Last updated: ${date}.`}</p>
      <Link href="/formulaire" className="kr-link">{t.indexTitle}</Link>
    </main>
  );
}
