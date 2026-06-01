import { formatAddress } from '../lib/registry'
import { NETWORK } from '../lib/contract-addresses'

const EXPECTED_CHAIN = NETWORK.CHAIN_ID

export default function WalletInfo({ account, chainId, onConnect, onDisconnect, onSwitchNetwork, loading }) {
  const isCorrectChain = chainId === EXPECTED_CHAIN

  return (
    <div className="mb-8">
      {account ? (
        <div className="space-y-3">
          {/* Wallet status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <div>
                <p className="text-foreground-secondary text-[11px] tracking-wider uppercase">
                  Connected
                </p>
                <p className="text-foreground font-body text-sm">
                  {formatAddress(account)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-foreground-secondary text-[11px] tracking-wider uppercase">
                  Chain
                </p>
                <p className={`font-body text-xs ${isCorrectChain ? 'text-success' : 'text-destructive'}`}>
                  {chainId === 5003 ? 'Mantle Sepolia' : chainId === 31337 ? 'Anvil' : `Chain ${chainId}`}
                </p>
              </div>
              <button
                onClick={onDisconnect}
                className="text-foreground-muted hover:text-destructive transition-colors duration-200 ml-1 p-1"
                title="Disconnect"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Wrong chain warning */}
          {!isCorrectChain && (
            <button
              onClick={onSwitchNetwork}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive font-body text-xs press-scale transition-all duration-200 hover:bg-destructive/20 disabled:opacity-50"
            >
              Switch to Mantle Sepolia
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-surface hover:bg-surface-elevated border border-border/60 text-foreground font-body text-sm press-scale transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
