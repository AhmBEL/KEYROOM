import type { Step } from "@/lib/deal";
import { DEFAULT_STEP_NOTE, STEP_NOTE } from "@/lib/deal";

const STATE_LABEL = { done: "Terminée", current: "En cours", upcoming: "À venir" } as const;

export function Steps({ steps, showNote = true }: { steps: Step[]; showNote?: boolean }) {
  return (
    <ol className="kr-steps">
      {steps.map((s) => (
        <li key={s.position} className={`kr-step kr-step--${s.status}`} aria-current={s.status === "current" ? "step" : undefined}>
          <span className="kr-step__dot" aria-hidden="true">{s.status === "done" ? "✓" : s.position}</span>
          <div className="kr-step__body">
            <p className="kr-step__title">{s.label}</p>
            <p className="kr-step__state">{STATE_LABEL[s.status]}</p>
            {showNote && s.status === "current" && (
              <p className="kr-step__note">Votre action : {STEP_NOTE[s.position] ?? DEFAULT_STEP_NOTE}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
