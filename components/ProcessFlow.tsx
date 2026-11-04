import { STEPS, TXT, type FlowStep, type Lang } from "@/lib/formdef";

// Logigramme vertical du process : 1, puis 2 (côté mandat et côté investisseurs, en parallèle), 3, 4,
// puis 5 et 6 en parallèle, puis 7, 8 et 9. Dessiné en HTML/CSS ; la couleur s'accompagne
// d'une légende et d'une liste cachée visuellement pour les lecteurs d'écran.
export function ProcessFlow({ lang }: { lang: Lang }) {
  const t = TXT[lang];
  const S = STEPS;
  const sideName = (s: FlowStep) => (s.side === "m" ? t.legendM : s.side === "i" ? t.legendI : "");

  const Box = ({ s, kind }: { s: FlowStep; kind: "pair" | "single" }) => (
    <div className={`kr-flow__box kr-flow__box--${kind}${s.side ? ` kr-flow__box--${s.side}` : ""}`}>
      <span className="kr-flow__n" aria-hidden="true">{s.n}</span>
      <span className="kr-flow__t"><b>{s.title[lang]}</b><span>{s.sub[lang]}</span></span>
    </div>
  );
  const Pair = ({ a, b }: { a: FlowStep; b: FlowStep }) => (
    <div className="kr-flow__pair"><Box s={a} kind="pair" /><span className="kr-flow__par">{t.parallel}</span><Box s={b} kind="pair" /></div>
  );
  const Line = () => (<div className="kr-flow__line"><i /></div>);
  const Merge = () => (<div className="kr-flow__merge"><i /></div>);
  const Split = () => (<div className="kr-flow__split"><i className="c" /><i className="l" /><i className="r" /></div>);

  // Description textuelle : même contenu que le schéma.
  const partner = (i: number) => (i === 1 ? S[2] : i === 2 ? S[1] : i === 5 ? S[6] : i === 6 ? S[5] : null);

  return (
    <figure className="kr-flow">
      <figcaption className="kr-sr">{t.flowLabel}</figcaption>
      <ol className="kr-sr">
        {S.map((s, i) => {
          const p = partner(i);
          const side = sideName(s);
          return (
            <li key={i}>
              {t.step} {s.n}{side ? ` (${side})` : ""} : {s.title[lang]}. {s.sub[lang]}.
              {p ? ` ${t.parallelWith(p.n)}${p.side ? ` (${sideName(p)})` : ""}.` : ""}
            </li>
          );
        })}
      </ol>
      <div className="kr-flow__chart" aria-hidden="true">
        <Box s={S[0]} kind="single" />
        <Split />
        <Pair a={S[1]} b={S[2]} />
        <Merge />
        <Box s={S[3]} kind="single" />
        <Line />
        <Box s={S[4]} kind="single" />
        <Split />
        <Pair a={S[5]} b={S[6]} />
        <Merge />
        <Box s={S[7]} kind="single" />
        <Line /><Box s={S[8]} kind="single" />
        <Line /><Box s={S[9]} kind="single" />
      </div>
      <p className="kr-flow__legend" aria-hidden="true">
        <span className="kr-flow__key kr-flow__key--m">{t.legendM}</span>
        <span className="kr-flow__key kr-flow__key--i">{t.legendI}</span>
      </p>
    </figure>
  );
}
