export interface StepItem {
  id: string;
  label: string;
}

export default function Stepper({
  steps,
  currentId,
}: {
  steps: StepItem[];
  currentId: string;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentId);

  return (
    <ol className="zad-stepper" aria-label="خطوات العملية">
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
        return (
          <li key={step.id} className="zad-stepper__item" data-state={state}>
            <span className="zad-stepper__dot" aria-hidden>
              {index + 1}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
