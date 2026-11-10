import type { Step } from "@/lib/demo/types";

// Logigramme générique : les étapes d'un même groupe se déroulent en parallèle. Deux étapes côte à côte,
// trois ou plus empilées avec un libellé « en parallèle ». Couleurs : or = côté vente, sable = côté recherche.
export function GenericFlow({ steps, showStatus = true, legend = true }: { steps: Step[]; showStatus?: boolean; legend?: boolean }) {
  const groups = [...new Set(steps.filter((s) => s.enabled).map((s) => s.group))].sort((a, b) => a - b)
    .map((g) => steps.filter((s) => s.enabled && s.group === g));
  if (!groups.length) return <p className="kr-small">Aucune étape active.</p>;

  const Box = ({ s, n, kind }: { s: Step; n: number; kind: "pair" | "single" }) => (
    <div className={`kr-flow__box kr-flow__box--${kind}${s.side ? ` kr-flow__box--${s.side === "sale" ? "m" : "i"}` : ""}${showStatus ? ` kr-flow__box--${s.status}` : ""}`}>
      <span className="kr-flow__n" aria-hidden="true">{showStatus && s.status === "done" ? "✓" : n}</span>
      <span className="kr-flow__t"><b>{s.title}</b><span>{s.sub}</span></span>
    </div>
  );
  const kindOf = (n: number) => (n === 1 ? "single" : n === 2 ? "pair" : "multi");

  return (
    <figure className="kr-flow">
      <ol className="kr-sr">
        {groups.map((g, i) => g.map((s) => (
          <li key={s.id}>Étape {i + 1} : {s.title}. {s.sub}.{showStatus ? ` Statut : ${s.status === "done" ? "terminée" : s.status === "current" ? "en cours" : "à venir"}.` : ""}{g.length > 1 ? " En parallèle avec les autres étapes du même rang." : ""}</li>
        )))}
      </ol>
      <div className="kr-flow__chart" aria-hidden="true">
        {groups.map((g, i) => {
          const prev = i > 0 ? kindOf(groups[i - 1].length) : null;
          const cur = kindOf(g.length);
          return (
            <div key={i} className="kr-flow__row">
              {prev && (
                prev === "pair" && cur === "pair" ? <><div className="kr-flow__merge"><i /></div><div className="kr-flow__split"><i className="c" /><i className="l" /><i className="r" /></div></>
                : prev === "pair" ? <div className="kr-flow__merge"><i /></div>
                : cur === "pair" ? <div className="kr-flow__split"><i className="c" /><i className="l" /><i className="r" /></div>
                : <div className="kr-flow__line"><i /></div>
              )}
              {cur === "pair" ? (
                <div className="kr-flow__pair"><Box s={g[0]} n={i + 1} kind="pair" /><span className="kr-flow__par">en parallèle</span><Box s={g[1]} n={i + 1} kind="pair" /></div>
              ) : cur === "multi" ? (
                <div className="kr-flow__stack">{g.map((s, k) => <div key={s.id}>{k > 0 && <span className="kr-flow__par kr-flow__par--on">en parallèle</span>}<Box s={s} n={i + 1} kind="single" /></div>)}</div>
              ) : <Box s={g[0]} n={i + 1} kind="single" />}
            </div>
          );
        })}
      </div>
      {legend && groups.some((g) => g.some((s) => s.side)) && (
        <p className="kr-flow__legend" aria-hidden="true">
          <span className="kr-flow__key kr-flow__key--m">Côté vente</span>
          <span className="kr-flow__key kr-flow__key--i">Côté recherche</span>
        </p>
      )}
    </figure>
  );
}
