"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Arch } from "@/components/demo2/ui";
import type { IconName } from "@/components/demo2/Icon";
import { profileFor } from "@/lib/demo/catalog";
import { useDemo } from "@/lib/demo/store";

const ROLE_LINE: Record<string, string> = {
  agent: "Vos clients voient un cadre sérieux dès le premier échange : questionnaire, mandat, signature, processus clair.",
  apporteur: "Vous arbitrez : vous réglez le processus et vous décidez, avec les parties, quand chaque information se révèle.",
  proprietaire: "Vous déposez vos documents une fois. Ils ne sont révélés que si vous le décidez.",
  acquereur: "Vous déposez vos pièces en confiance. L'autre partie ne les voit qu'au bon moment.",
  mandat_vente: "Vous présentez vos biens sans exposer vos mandants.",
  mandat_recherche: "Vous présentez vos acquéreurs sans les exposer.",
  notaire: "Vous suivez l'avancement et recevez les pièces qui vous sont destinées avant l'acte.",
  avocat: "Vous vérifiez que les étapes protègent bien les intérêts de votre client.",
  autre: "Vous choisissez votre rôle projet par projet.",
};

export default function Welcome2() {
  const router = useRouter();
  const { state, patchProfile, seedExample } = useDemo();
  const [i, setI] = useState(0);
  const pr = state.profile; const p = profileFor(pr?.kind ?? null);
  const slides: { icon: IconName; title: string; text: string }[] = [
    { icon: "building", title: `Bienvenue${pr?.firstName ? `, ${pr.firstName}` : ""}`, text: "Voici en trois écrans comment la plateforme sécurise vos transactions." },
    { icon: "lock", title: "Chacun dépose, personne ne voit", text: "Chaque partie remplit son coffre privé. Tout le monde voit seulement si l'autre a terminé, jamais le contenu." },
    { icon: "shield", title: "Tout se révèle par étapes", text: `${ROLE_LINE[pr?.kind ?? "autre"]}` },
  ];
  const s = slides[i];
  const done = (example: boolean) => {
    patchProfile({ onboarded: true });
    if (example && pr) router.push(`/demo2/projets/${seedExample({ ...pr, onboarded: true })}`); else router.push("/demo2/projets/nouveau");
  };
  return (
    <div className="kr2-screen kr2-center">
      <Arch icon={s.icon} />
      <h1 className="kr2-title">{s.title}</h1>
      <p className="kr2-help">{s.text}</p>
      {i === 0 && p && <p className="kr2-chip kr2-chip--wait">{p.label}</p>}
      <div className="kr2-bar" style={{ width: 96 }} aria-hidden="true"><i style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
      <div className="kr2-actions" style={{ width: "100%" }}>
        {i < slides.length - 1 ? <button type="button" className="kr-btn kr-btn--primary" onClick={() => setI(i + 1)}>Continuer</button> : (
          <>
            <button type="button" className="kr-btn kr-btn--primary" onClick={() => done(false)}>Créer mon premier projet</button>
            <button type="button" className="kr-btn kr-btn--outline" onClick={() => done(true)}>Découvrir un exemple</button>
          </>
        )}
        {i > 0 && <button type="button" className="kr-link" onClick={() => setI(i - 1)}>Retour</button>}
      </div>
    </div>
  );
}
