export default function CIDInput({ cid, setCid, onNext, onBack }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body">
          IPFS Content ID (CID)
        </label>
        <input
          type="text"
          value={cid}
          onChange={(e) => setCid(e.target.value)}
          placeholder="e.g. QmYAdJSV3hvzrGJUTxg7KuL7jcZ6zcHMUyTf8y3enPgsAg"
          className="w-full px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
          autoFocus
        />
      </div>
      <div className="p-3 rounded-lg bg-surface border border-border/40">
        <p className="text-foreground-muted text-[11px] font-body leading-relaxed">
          Upload your persona metadata JSON to IPFS (via CLI, Pinata, or Web3.Storage), then paste the CID above.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg border border-border/60 text-foreground-secondary font-body text-sm press-scale transition-colors duration-200 hover:bg-surface"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!cid.trim()}
          className="flex-[2] py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
        >
          Next Step
        </button>
      </div>
    </div>
  )
}
