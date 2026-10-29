import { blocksFor, display, isVisible, type Answers, type Role } from "@/lib/questionnaire";

export function Recap({ role, answers }: { role: Role; answers: Answers }) {
  return (
    <div className="kr-recap">
      {blocksFor(role).map((b) => {
        const rows = b.questions.filter((q) => isVisible(q, answers) && answers[q.id]);
        if (!rows.length) return null;
        return (
          <section key={b.id} className="kr-card">
            <h3 className="kr-title-3">{b.title}</h3>
            <dl className="kr-dl">
              {rows.map((q) => (
                <div key={q.id}><dt>{q.label}</dt><dd>{display(answers[q.id])}</dd></div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
