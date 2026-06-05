const STEPS = [
  { num: 1, label: 'Define' },
  { num: 2, label: 'Sign' },
  { num: 3, label: 'Upload' },
  { num: 4, label: 'Register' },
  { num: 5, label: 'Done' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6 sm:mb-8 px-1">
      {STEPS.map((step, i) => {
        const isActive = step.num === currentStep
        const isComplete = step.num < currentStep

        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none min-w-0">
            {/* Step dot + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-body font-bold
                  transition-all duration-300
                  ${isActive
                    ? 'bg-[#f0f0fa] text-[#000] shadow-[0_0_10px_rgba(240,240,250,0.3)] scale-110'
                    : isComplete
                      ? 'bg-[rgba(240,240,250,0.12)] text-[#f0f0fa] border border-white/20'
                      : 'bg-[rgba(240,240,250,0.03)] text-[#f0f0fa]/30 border border-white/[0.06]'
                  }
                `}
              >
                {isComplete ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.num}
              </div>
              <span
                className={`
                  text-[8px] sm:text-[9px] tracking-wider uppercase font-body whitespace-nowrap
                  transition-colors duration-200
                  ${isActive ? 'text-[#f0f0fa]' : isComplete ? 'text-[#f0f0fa]/60' : 'text-[#f0f0fa]/20'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 sm:mx-2 mt-[-1.2rem]">
                <div
                  className={`h-full transition-all duration-500 ${isComplete ? 'bg-white/30' : 'bg-white/[0.06]'}`}
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
