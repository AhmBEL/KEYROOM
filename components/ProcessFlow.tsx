import { STEPS, TXT, type Lang } from "@/lib/formdef";

// Logigramme vertical des 9 étapes : 1 et 2 en parallèle, puis 3, 4 et 5 en parallèle, puis 6 à 9.
// Dessiné en HTML/CSS. Une liste cachée visuellement décrit la même chose aux lecteurs d'écran.
export function ProcessFlow({ lang }: { lang: Lang }) {
  const t = TXT[lang];
  const text = (n: number) => STEPS[n - 1].label[lang];
  const parallel: Record<number, number> = { 1: 2, 2: 1, 4: 5, 5: 4 };

  const Box = ({ n, kind }: { n: number; kind: "pair" | "single" }) => (
    <div className={`kr-flow__box kr-flow__box--${kind}`}>
      <span className="kr-flow__n" aria-hidden="true">{n}</span>
      <span className="kr-flow__t">{text(n)}</span>
    </div>
  );
  const Line = () => (<div className="kr-flow__line"><i /></div>);

  return (
    <figure className="kr-flow">
      <figcaption className="kr-sr">{t.flowLabel}</figcaption>
      <ol className="kr-sr">
        {STEPS.map((s) => (
          <li key={s.n}>{t.step} {s.n} : {s.label[lang]}{parallel[s.n] ? ` (${t.parallelWith(parallel[s.n])})` : ""}</li>
        ))}
      </ol>
      <div className="kr-flow__chart" aria-hidden="true">
        <div className="kr-flow__pair"><Box n={1} kind="pair" /><span className="kr-flow__par">{t.parallel}</span><Box n={2} kind="pair" /></div>
        <div className="kr-flow__merge"><i /></div>
        <Box n={3} kind="single" />
        <div className="kr-flow__split"><i className="c" /><i className="l" /><i className="r" /></div>
        <div className="kr-flow__pair"><Box n={4} kind="pair" /><span className="kr-flow__par">{t.parallel}</span><Box n={5} kind="pair" /></div>
        <div className="kr-flow__merge"><i /></div>
        <Box n={6} kind="single" />
        <Line /><Box n={7} kind="single" />
        <Line /><Box n={8} kind="single" />
        <Line /><Box n={9} kind="single" />
      </div>
    </figure>
  );
}
