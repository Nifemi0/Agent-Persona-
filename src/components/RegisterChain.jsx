import { useState } from 'react'
import { registerPersona, personaIdFromInput, formatAddress } from '../lib/registry'

export default function RegisterChain({ account, name, cid, signature, onRegistered, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const personaId = personaIdFromInput(name)

  async function handleRegister() {
    setLoading(true)
    setError(null)
    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = provider.getSigner()
      const result = await registerPersona(signer, personaId, cid, signature)
      onRegistered(result)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-2">
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
            Persona ID
          </span>
          <span className="text-foreground-muted text-xs font-body break-all max-w-[200px] text-right">
            {personaId.slice(0, 20)}...
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
            Wallet
          </span>
          <span className="text-foreground-secondary text-xs font-body">
            {formatAddress(account)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
            CID
          </span>
          <span className="text-foreground-muted text-xs font-body break-all max-w-[200px] text-right">
            {cid}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-destructive text-xs font-body">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3 rounded-lg border border-border/60 text-foreground-secondary font-body text-sm press-scale transition-colors duration-200 hover:bg-surface disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="flex-[2] py-3 rounded-lg bg-accent text-white font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(139,92,246,0.25)] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Registering...
            </>
          ) : (
            'Register on Chain'
          )}
        </button>
      </div>
    </div>
  )
}
