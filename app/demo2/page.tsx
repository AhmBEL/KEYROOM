import Link from "next/link";
import { Arch } from "@/components/demo2/ui";
import { Icon } from "@/components/demo2/Icon";

export default function Welcome() {
  return (
    <div className="kr2-screen kr2-center">
      <Arch icon="building" />
      <p className="kr2-eyebrow">Transactions sécurisées</p>
      <h1 className="kr2-title">Chacun dépose. Personne ne voit. Tout se révèle au bon moment.</h1>
      <div className="kr2-grid" style={{ width: "100%", textAlign: "left" }}>
        <div className="kr2-task" style={{ cursor: "default" }}><span className="kr2-task__ico"><Icon name="lock" size={18} /></span><span className="kr2-task__txt">Vos documents restent privés<span>Personne ne les consulte avant l'étape prévue.</span></span></div>
        <div className="kr2-task" style={{ cursor: "default" }}><span className="kr2-task__ico"><Icon name="users" size={18} /></span><span className="kr2-task__txt">Tout le monde avance ensemble<span>Fini la bataille de qui dépose le premier.</span></span></div>
        <div className="kr2-task" style={{ cursor: "default" }}><span className="kr2-task__ico"><Icon name="shield" size={18} /></span><span className="kr2-task__txt">Vous gardez la main<span>Le processus se règle projet par projet.</span></span></div>
      </div>
      <div className="kr2-actions" style={{ width: "100%" }}>
        <Link href="/demo2/inscription" className="kr-btn kr-btn--primary">Commencer</Link>
        <Link href="/demo2/bientot" className="kr-link">Voir ce qui arrive bientôt</Link>
      </div>
    </div>
  );
}
