import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/session";

export const metadata = { title: "Votre dossier — Keyroom" };

export default async function DossierPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  const { supabase, profile } = session;

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

  const { data: deals } = await supabase.from("deals").select("id, reference").order("created_at");

  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">Bonjour {profile.prenom}</h1>
      {deals?.length ? (
        deals.map((d) => (
          <section key={d.id} className="kr-card">
            <p className="kr-card__ref">{d.reference}</p>
            <h2 className="kr-title-3">Votre dossier</h2>
            <p className="kr-small">Les étapes et le questionnaire arrivent à la prochaine mise à jour.</p>
          </section>
        ))
      ) : (
        <p className="kr-body">Aucun dossier ne vous est encore rattaché.</p>
      )}
      <SignOutButton />
    </main>
  );
}
