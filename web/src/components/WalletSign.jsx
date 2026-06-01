import { signIdentity, formatAddress } from '../lib/registry'

export default function WalletSign({ account, name, onSigned, onBack }) {
  async function handleSign() {
    const { ethers } = await import('ethers')
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = provider.getSigner()
    const sig = await signIdentity(await signer, name)
    onSigned(sig)
  }

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-3">
        <p className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">
          Message to Sign
        </p>
        <p className="text-foreground font-body text-sm break-all bg-background/50 p-3 rounded border border-border/30">
          {name}
        </p>
        <div className="flex items-center gap-2 text-foreground-muted text-xs font-body">
          <span>Wallet:</span>
          <span className="text-foreground-secondary">{formatAddress(account)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-lg border border-border/60 text-foreground-secondary font-body text-sm press-scale transition-colors duration-200 hover:bg-surface"
        >
          Back
        </button>
        <button
          onClick={handleSign}
          className="flex-[2] py-3 rounded-lg bg-accent text-white font-body text-sm font-bold press-scale transition-all duration-200 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]"
        >
          Sign with MetaMask
        </button>
      </div>
    </div>
  )
}
