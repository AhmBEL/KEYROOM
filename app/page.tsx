import Link from "next/link";
import { Logo } from "@/components/Logo";

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Home() {
  return (
    <main className="kr-page">
      <Logo width={200} />
      <p className="kr-eyebrow">Hotels open new opportunities</p>
      <h1 className="kr-title-1">Des lieux d&rsquo;exception. Des opportunités concrètes.</h1>
      <p className="kr-body-lg">Votre espace de dossier, sécurisé. L&rsquo;accès se fait sur invitation.</p>
      <div className="kr-actions">
        <Link href="/connexion" className="kr-btn kr-btn--primary">Se connecter</Link>
        {contact && (
          <a href={`mailto:${contact}?subject=Demande%20d%E2%80%99acc%C3%A8s%20Keyroom`} className="kr-link">
            Demander un accès
          </a>
        )}
      </div>
    </main>
  );
}
