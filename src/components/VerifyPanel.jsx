import { useState } from 'react'
import { verifyPersona, formatAddress, formatTimestamp } from '../lib/registry'

export default function VerifyPanel({ account }) {
  const [address, setAddress] = useState(account || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleVerify() {
    if (!address.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await verifyPersona(address.trim())
      setResult(data)
    } catch (err) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body">
          Wallet Address
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
          />
          <button
            onClick={handleVerify}
            disabled={loading || !address.trim()}
            className="px-5 py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              'Verify'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-destructive text-xs font-body">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-3">
          <p className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
            Persona Data
          </p>

          {result.personaId === '0x0000000000000000000000000000000000000000000000000000000000000000' || result.revoked ? (
            <div className="text-center py-4">
              <p className="text-foreground-muted text-sm font-body">
                {result.revoked ? 'Persona has been revoked' : 'No persona registered for this address'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
                  Persona ID
                </span>
                <span className="text-foreground-muted text-xs font-body break-all max-w-[200px] text-right">
                  {result.personaId.slice(0, 30)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
                  CID
                </span>
                <span className="text-primary text-xs font-body break-all max-w-[200px] text-right">
                  {result.cid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
                  Registered
                </span>
                <span className="text-foreground-muted text-xs font-body">
                  {formatTimestamp(result.timestamp)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
                  Status
                </span>
                <span className="text-success text-xs font-body">
                  Active
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
