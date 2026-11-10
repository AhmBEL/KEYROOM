"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useDemo } from "@/lib/demo/store";
import { Icon } from "./Icon";

export function Shell2({ children }: { children: React.ReactNode }) {
  const { ready, state, resetDemo } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const signedIn = Boolean(state.profile?.email || state.profile?.firstName);
  const open = path === "/demo2" || path.startsWith("/demo2/inscription") || path === "/demo2/bientot";

  useEffect(() => {
    if (!ready) return;
    if (!signedIn && !open) router.replace("/demo2/inscription");
    else if (signedIn && state.profile && !state.profile.onboarded && !open && !path.startsWith("/demo2/bienvenue")) router.replace("/demo2/bienvenue");
  }, [ready, signedIn, open, path, state.profile, router]);

  const nav = (href: string, icon: "folder" | "user" | "star", label: string) => (
    <Link href={href} aria-current={path.startsWith(href) ? "page" : undefined}><Icon name={icon} size={22} />{label}</Link>
  );

  return (
    <div className="kr2-page">
      <header className="kr2-top">
        <Link href="/demo2" aria-label="Accueil"><Logo width={132} /></Link>
        {signedIn && state.profile?.onboarded && <nav className="kr2-nav" aria-label="Navigation">{nav("/demo2/projets", "folder", "Projets")}{nav("/demo2/profil", "user", "Profil")}{nav("/demo2/bientot", "star", "À venir")}</nav>}
      </header>
      {ready ? children : <p className="kr2-help">Chargement…</p>}
      <footer className="kr2-foot">
        <p>Démonstration, version 2 : tout reste dans ce navigateur, rien n'est envoyé. Seul le nom des documents est conservé.</p>
        <p><Link href="/demo" className="kr-link">Voir la version 1</Link> · <button type="button" className="kr-link" onClick={() => { if (window.confirm("Effacer toutes les données de la démonstration ?")) { router.push("/demo2"); setTimeout(resetDemo, 150); } }}>Réinitialiser</button></p>
      </footer>
    </div>
  );
}
