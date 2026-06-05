const STEPS = [
  { num: 1, label: 'Define' },
  { num: 2, label: 'Sign' },
  { num: 3, label: 'PIN' },
  { num: 4, label: 'Register' },
  { num: 5, label: 'Done' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {STEPS.map((step, i) => {
        const isActive = step.num === currentStep
        const isComplete = step.num < currentStep

        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            {/* Step dot + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-bold
                  transition-all duration-300 ease-out-strong
                  ${isActive
                    ? 'bg-primary text-background shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-110'
                    : isComplete
                      ? 'bg-primary/20 text-primary border border-primary/50'
                      : 'bg-muted text-foreground-muted border border-border'
                  }
                `}
              >
                {isComplete ? '✓' : step.num}
              </div>
              <span
                className={`
                  text-[10px] tracking-wider uppercase font-body
                  transition-colors duration-200
                  ${isActive ? 'text-primary' : isComplete ? 'text-primary/70' : 'text-foreground-muted'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3 mt-[-1.5rem]">
                <div
                  className={`h-full transition-all duration-500 ease-out-strong ${
                    isComplete ? 'bg-primary/50' : 'bg-border'
                  }`}
                  style={{ height: '1px' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
