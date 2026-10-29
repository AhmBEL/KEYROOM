import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion — Keyroom" };

export default async function ConnexionPage() {
  const session = await getSession().catch(() => null);
  if (session) redirect("/dossier");
  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">Connexion</h1>
      <p className="kr-body">L&rsquo;accès se fait sur invitation. Saisissez votre adresse, puis le code reçu par email. Pas de mot de passe.</p>
      <LoginForm />
    </main>
  );
}
