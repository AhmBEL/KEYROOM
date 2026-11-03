import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Recap } from "@/components/Recap";
import { requireAdmin } from "@/lib/session";
import type { Answers } from "@/lib/questionnaire";

export const metadata = { title: "Réponse reçue — Keyroom" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FormulaireDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!UUID_RE.test(id)) notFound();
  const { data: row } = await supabase.from("form_submissions").select("id, form, lang, answers, created_at").eq("id", id).maybeSingle();
  if (!row) notFound();
  const role = row.form === "mandat" ? "partie_mandat" : "partie_investisseurs";

  return (
    <main className="kr-page">
      <Logo width={160} />
      <Link href="/admin/formulaires" className="kr-link">← Formulaires reçus</Link>
      <h1 className="kr-title-2">{row.form === "mandat" ? "Partie mandat" : "Partie investisseurs"}</h1>
      <p className="kr-small">Reçu le {new Date(row.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} · rempli en {row.lang === "en" ? "anglais" : "français"}. Les réponses sont affichées en français.</p>
      <Recap role={role} answers={row.answers as Answers} />
    </main>
  );
}
