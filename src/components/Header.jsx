export default function Header() {
  return (
    <header className="border-b border-border/60 pb-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Persona logo */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow-border">
            <span className="text-background font-heading text-sm font-bold">PR</span>
          </div>
          <div>
            <h1 className="text-2xl tracking-wider font-heading text-glow">
              Persona Registry
            </h1>
            <p className="text-foreground-secondary text-xs mt-0.5 tracking-wider">
              On-chain Identity Protocol
            </p>
          </div>
        </div>

        {/* Mantle network badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-elevated/60 border border-border/40">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" fill="#FFD700" fillOpacity="0.15" stroke="#FFD700" strokeWidth="1.5"/>
            <text x="16" y="21" textAnchor="middle" fill="#FFD700" fontSize="16" fontWeight="bold" fontFamily="sans-serif">M</text>
          </svg>
          <span className="text-foreground-muted text-[10px] font-body tracking-wider uppercase">
            Mantle Sepolia
          </span>
        </div>
      </div>
    </header>
  )
}
