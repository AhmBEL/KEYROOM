import { SOON } from "@/lib/demo/catalog";

export const Soon = ({ children = "Bientôt disponible" }: { children?: React.ReactNode }) => <span className="kr-soon">{children}</span>;

export function SoonList({ ids }: { ids?: string[] }) {
  const items = ids ? SOON.filter((s) => ids.includes(s.id)) : SOON;
  return (
    <div className="kr-soon-list">
      {items.map((s) => (
        <article key={s.id} className="kr-card kr-card--soon">
          <p className="kr-card__ref">Bientôt disponible</p>
          <h3 className="kr-title-3">{s.title}</h3>
          <p className="kr-small">{s.text}</p>
        </article>
      ))}
    </div>
  );
}
