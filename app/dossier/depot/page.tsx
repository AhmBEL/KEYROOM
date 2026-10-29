import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DocCard } from "@/components/DocCard";
import { UploadForm } from "@/components/UploadForm";
import { getSession } from "@/lib/session";
import { getDocuments, getMyDeal } from "@/lib/deal";

export const metadata = { title: "Mes dépôts — Keyroom" };

export default async function DepotPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (!session.profile || session.profile.role === "admin") redirect("/dossier");
  const mine = await getMyDeal(session.supabase, session.user.id);
  if (!mine) redirect("/dossier");

  const isMandat = mine.role === "partie_mandat";
  const category = isMandat ? "teaser" : "criteres";
  const docs = (await getDocuments(session.supabase, mine.deal.id)).filter((d) => d.uploaded_by === session.user.id && d.category !== "accord_genere");

  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">{isMandat ? "Votre teaser anonyme" : "Vos critères anonymes"}</h1>
      <p className="kr-body">
        {isMandat
          ? "Décrivez l'hôtel sans le nommer : zone, catégorie, fourchette de prix. Aucun nom d'hôtel, aucune coordonnée."
          : "Décrivez ce que vous cherchez sans nommer l'investisseur : zones, catégories, budget. Aucun nom, aucune coordonnée."}
      </p>
      <p className="kr-body">Vos dépôts restent visibles par vous seul. Ahmed décide quand un document passe de l&rsquo;autre côté.</p>

      <UploadForm dealId={mine.deal.id} category={category} label={isMandat ? "Fichier du teaser" : "Fichier des critères"} />

      <h2 className="kr-title-3">Vos dépôts</h2>
      {docs.length ? docs.map((d) => <DocCard key={d.id} doc={d} mine />) : <p className="kr-body">Aucun dépôt pour le moment.</p>}
      <Link href="/dossier" className="kr-link">Retour au dossier</Link>
    </main>
  );
}
