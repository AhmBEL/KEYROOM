import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { confirmLogin } from "./actions";

export const metadata: Metadata = { title: "Connexion — Keyroom", robots: { index: false, follow: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; erreur?: string }> }) {
  const { token_hash, type, erreur } = await searchParams;
  const valid = Boolean(token_hash) && type === "magiclink" && !erreur;

  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">Accès à votre espace</h1>
      {valid ? (
        <>
          <p className="kr-body">Cliquez sur le bouton ci-dessous pour ouvrir votre espace de dossier.</p>
          <form action={confirmLogin} className="kr-form">
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type} />
            <button type="submit" className="kr-btn kr-btn--primary">Accéder à mon espace</button>
          </form>
        </>
      ) : (
        <>
          <p className="kr-error" role="alert">Ce lien n'est plus valable : il a déjà été utilisé ou il a expiré.</p>
          <p className="kr-body">Demandez un nouveau lien à la personne qui vous l'a transmis, ou connectez-vous avec votre adresse email.</p>
          <Link href="/connexion" className="kr-btn kr-btn--outline">Se connecter</Link>
        </>
      )}
    </main>
  );
}
