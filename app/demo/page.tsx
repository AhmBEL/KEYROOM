import Link from "next/link";
import { BRAND } from "@/lib/demo/catalog";

export default function DemoHome() {
  return (
    <>
      <p className="kr-eyebrow">Transactions sécurisées</p>
      <h1 className="kr-title-1">{BRAND}</h1>
      <p className="kr-body-lg">Un espace où chaque partie dépose ses documents en toute confidentialité, et où rien n'est révélé avant l'étape qui le justifie.</p>
      <div className="kr-grid">
        <p className="kr-body">Vous créez un projet de vente, vous invitez les parties avec un rôle, vous réglez le processus, les questionnaires et les documents demandés. Chacun avance au même rythme, sans attendre que l'autre dépose le premier.</p>
        <p className="kr-body">Cette version de démonstration vous permet de parcourir tout le parcours avec des données fictives.</p>
      </div>
      <div className="kr-actions">
        <Link href="/demo/inscription" className="kr-btn kr-btn--primary">Commencer</Link>
        <Link href="/demo/bientot" className="kr-link">Voir ce qui arrive bientôt</Link>
      </div>
    </>
  );
}
