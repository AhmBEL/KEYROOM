"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useDemo } from "@/lib/demo/store";

// Cadre commun de la démonstration : bandeau, navigation, mention « tout reste dans ce navigateur ».
export function DemoShell({ children }: { children: React.ReactNode }) {
  const { ready, state, resetDemo } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const signedIn = Boolean(state.profile?.email || state.profile?.firstName);

  const open = path === "/demo" || path.startsWith("/demo/inscription");
  useEffect(() => {
    if (!ready) return;
    if (!signedIn && !open && path !== "/demo/bientot") router.replace("/demo/inscription");
    else if (signedIn && state.profile && !state.profile.onboarded && !open && !path.startsWith("/demo/bienvenue") && path !== "/demo/bientot") router.replace("/demo/bienvenue");
  }, [ready, signedIn, open, path, state.profile, router]);

  const link = (href: string, label: string) => <Link href={href} aria-current={path === href || (href !== "/demo" && path.startsWith(href)) ? "page" : undefined}>{label}</Link>;

  return (
    <main className="kr-page">
      <div className="kr-demo-bar">
        <Link href="/demo" aria-label="Accueil de la démonstration"><Logo width={150} /></Link>
        <span className="kr-demo-badge">Démonstration</span>
      </div>
      {signedIn && state.profile?.onboarded && (
        <nav className="kr-demo-nav" aria-label="Navigation">
          {link("/demo/projets", "Mes projets")}{link("/demo/profil", "Mon profil")}{link("/demo/bientot", "À venir")}
        </nav>
      )}
      {ready ? children : <p className="kr-small">Chargement…</p>}
      <footer className="kr-legal-footer">
        <p className="kr-small">Version de démonstration : vos actions restent dans ce navigateur, rien n'est envoyé, aucun email ni document réel. Les documents ne sont pas transmis : seul leur nom est conservé.</p>
        <button type="button" className="kr-link" onClick={() => { if (window.confirm("Effacer toutes les données de la démonstration ?")) { router.push("/demo"); setTimeout(resetDemo, 150); } }}>Réinitialiser la démonstration</button>
      </footer>
    </main>
  );
}
