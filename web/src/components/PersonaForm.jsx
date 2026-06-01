import { personaIdFromInput } from '../lib/registry'

export default function PersonaForm({ name, setName, onNext }) {
  const personaId = name.trim() ? personaIdFromInput(name.trim()) : null

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body">
          Identity Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. persona-alice-v1"
          className="w-full px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
          autoFocus
        />
      </div>

      {personaId && (
        <div className="p-3 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-1">
          <p className="text-foreground-secondary text-[10px] tracking-wider uppercase font-body">
            Derived Persona ID
          </p>
          <p className="text-foreground-muted text-xs font-body break-all select-all">
            {personaId}
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
      >
        Next Step
      </button>
    </div>
  )
}
