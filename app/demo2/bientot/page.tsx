import { SOON } from "@/lib/demo/catalog";
import { Icon, type IconName } from "@/components/demo2/Icon";

const ICON: Record<string, IconName> = { id: "user", company: "building", esign: "pencil", contract: "file", ai: "star", vault: "lock", notif: "bell" };

export default function SoonPage() {
  return (
    <div className="kr2-screen">
      <h1 className="kr2-title">À venir</h1>
      <p className="kr2-help">Ces fonctions apparaissent dans la démonstration avec la mention « Bientôt disponible ».</p>
      <div className="kr2-grid">
        {SOON.map((s) => (
          <div key={s.id} className="kr2-task" style={{ cursor: "default", alignItems: "flex-start" }}>
            <span className="kr2-task__ico"><Icon name={ICON[s.id] ?? "star"} size={18} /></span>
            <span className="kr2-task__txt"><span className="kr2-chip kr2-chip--wait" style={{ width: "fit-content" }}>Bientôt disponible</span>{s.title}<span>{s.text}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
