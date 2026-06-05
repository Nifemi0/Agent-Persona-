import { formatAddress } from '../lib/registry'

export default function CompleteStep({ account, name, cid, result, onReset }) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-success/20 border border-success/40 flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-heading text-foreground tracking-wider text-glow">
          Persona Registered
        </h3>
        <p className="text-foreground-muted text-xs font-body mt-1">
          Your on-chain identity is live
        </p>
      </div>

      <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Name</span>
          <span className="text-foreground text-xs font-body">{name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">CID</span>
          <span className="text-foreground-muted text-xs font-body break-all max-w-[180px] text-right">{cid}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Tx Hash</span>
          <span className="text-foreground-muted text-xs font-body break-all max-w-[180px] text-right">{result.txHash.slice(0, 20)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Block</span>
          <span className="text-foreground-muted text-xs font-body">{result.blockNumber}</span>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
      >
        Register Another Persona
      </button>
    </div>
  )
}
