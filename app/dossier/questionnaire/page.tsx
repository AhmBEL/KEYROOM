import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Recap } from "@/components/Recap";
import { getSession } from "@/lib/session";
import { getMyDeal } from "@/lib/deal";
import type { Answers } from "@/lib/questionnaire";
import { QuestionnaireForm } from "./QuestionnaireForm";

export const metadata = { title: "Questionnaire — Keyroom" };

export default async function QuestionnairePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (!session.profile || session.profile.role === "admin") redirect("/dossier");
  const mine = await getMyDeal(session.supabase, session.user.id);
  if (!mine) redirect("/dossier");

  const { data: response } = await session.supabase
    .from("questionnaire_responses").select("answers, submitted_at").eq("deal_id", mine.deal.id).eq("user_id", session.user.id).maybeSingle();
  const submitted = Boolean(response?.submitted_at);

  return (
    <main className="kr-page kr-page--has-sticky">
      <Logo width={160} />
      {submitted ? (
        <>
          <h1 className="kr-title-2">Merci, vos réponses sont enregistrées</h1>
          <p className="kr-body">Voici le récapitulatif. Nous préparons l&rsquo;accord à partir de ces réponses.</p>
          <Recap role={mine.role} answers={(response?.answers ?? {}) as Answers} />
          <Link href="/dossier" className="kr-btn kr-btn--primary">Retour au dossier</Link>
        </>
      ) : (
        <>
          <h1 className="kr-title-2">Questionnaire de cadrage</h1>
          <p className="kr-body">Remplissez-le en une fois. Aucune coordonnée bancaire, aucun nom d&rsquo;hôtel ou d&rsquo;investisseur, aucun chiffre confidentiel à ce stade.</p>
          <QuestionnaireForm role={mine.role} />
        </>
      )}
    </main>
  );
}
