"use client";

type BookingStepperProps = {
  currentStep: number;
  labels: string[];
};

export function BookingStepper({ currentStep, labels }: BookingStepperProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Consultation booking steps">
      {labels.map((label, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isComplete = step < currentStep;

        return (
          <li
            key={label}
            className={`rounded-xl border px-4 py-3 transition ${
              isActive
                ? "border-olive-600 bg-olive-100 text-olive-950 dark:border-olive-400 dark:bg-olive-900/80 dark:text-white"
                : "border-olive-300/70 bg-white/60 text-olive-700 dark:border-olive-800 dark:bg-olive-900/40 dark:text-olive-300"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Step {step}
              {isComplete ? " · Done" : ""}
            </p>
            <p className="mt-1 text-sm font-medium">{label}</p>
          </li>
        );
      })}
    </ol>
  );
}
