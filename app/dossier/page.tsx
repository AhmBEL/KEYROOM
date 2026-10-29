import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";
import { Steps } from "@/components/Steps";
import { DocCard } from "@/components/DocCard";
import { getSession } from "@/lib/session";
import { getDocuments, getMyDeal, getSteps } from "@/lib/deal";

export const metadata = { title: "Votre dossier — Keyroom" };

export default async function DossierPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const { supabase, profile, user } = session;

  if (!profile) {
    return (
      <main className="kr-page">
        <Logo width={160} />
        <h1 className="kr-title-2">Compte non rattaché</h1>
        <p className="kr-body">Votre compte n&rsquo;est pas encore rattaché à un dossier. Contactez Ahmed pour finaliser votre invitation.</p>
        <SignOutButton />
      </main>
    );
  }
  if (profile.role === "admin") redirect("/admin");

  const mine = await getMyDeal(supabase, user.id);
  if (!mine) {
    return (
      <main className="kr-page">
        <Logo width={160} />
        <h1 className="kr-title-2">Bonjour {profile.prenom}</h1>
        <p className="kr-body">Aucun dossier ne vous est encore rattaché.</p>
        <SignOutButton />
      </main>
    );
  }

  const [steps, docs, { data: response }] = await Promise.all([
    getSteps(supabase, mine.deal.id),
    getDocuments(supabase, mine.deal.id),
    supabase.from("questionnaire_responses").select("submitted_at").eq("deal_id", mine.deal.id).eq("user_id", user.id).maybeSingle(),
  ]);

  const current = steps.find((s) => s.status === "current");
  const submitted = Boolean(response?.submitted_at);
  const accord = docs.find((d) => d.category === "accord_genere");
  const signed = docs.find((d) => d.category === "accord_signe");
  const depositCategory = mine.role === "partie_mandat" ? "teaser" : "criteres";
  const hasDeposit = docs.some((d) => d.category === depositCategory && d.uploaded_by === user.id);

  // Une seule action principale à la fois.
  let todo: { title: string; text: string; href?: string; label?: string; external?: boolean } | null = null;
  if (!submitted) {
    todo = { title: "À faire maintenant", text: "Répondez au questionnaire de cadrage. Cela prend quelques minutes.", href: "/dossier/questionnaire", label: "Répondre au questionnaire" };
  } else if (accord && !signed) {
    todo = { title: "À faire maintenant", text: "Téléchargez l'accord, relisez-le et signez-le. Nous vous indiquons comment le retourner.", href: `/dossier/documents/${accord.id}`, label: "Télécharger l'accord", external: true };
  } else if (current && current.position >= 2 && !hasDeposit) {
    todo = {
      title: "À faire maintenant",
      text: mine.role === "partie_mandat" ? "Déposez votre teaser anonyme. N'y mentionnez aucun nom d'hôtel." : "Déposez vos critères de recherche anonymes. N'y mentionnez aucun nom d'investisseur.",
      href: "/dossier/depot", label: mine.role === "partie_mandat" ? "Déposer votre teaser" : "Déposer vos critères",
    };
  }

  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">Bonjour {profile.prenom}</h1>
      <p className="kr-card__ref kr-ref-line">Dossier {mine.deal.reference}</p>

      <section className="kr-todo" aria-labelledby="todo">
        <h2 id="todo" className="kr-eyebrow">À faire maintenant</h2>
        {todo ? (
          <>
            <p className="kr-body">{todo.text}</p>
            {todo.external
              ? <a className="kr-btn kr-btn--primary" href={todo.href} target="_blank" rel="noopener">{todo.label}</a>
              : <Link className="kr-btn kr-btn--primary" href={todo.href!}>{todo.label}</Link>}
          </>
        ) : (
          <p className="kr-body">Rien à faire pour le moment. Nous vous contactons dès que le dossier avance.</p>
        )}
      </section>

      <h2 className="kr-title-3">Le process</h2>
      <Steps steps={steps} />

      <h2 className="kr-title-3">Documents du dossier</h2>
      {docs.length ? docs.map((d) => <DocCard key={d.id} doc={d} mine={d.uploaded_by === user.id} />)
        : <p className="kr-body">Aucun document pour le moment.</p>}
      {submitted && <Link className="kr-link" href="/dossier/questionnaire">Revoir mes réponses au questionnaire</Link>}
      {hasDeposit || (current && current.position >= 2) ? <Link className="kr-link" href="/dossier/depot">Mes dépôts</Link> : null}

      <div className="kr-footer-actions"><SignOutButton /></div>
    </main>
  );
}
