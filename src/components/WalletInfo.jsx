import { formatAddress } from '../lib/registry'
import { NETWORK } from '../lib/contract-addresses'

const EXPECTED_CHAIN = NETWORK.CHAIN_ID

export default function WalletInfo({ account, chainId, onConnect, onDisconnect, onSwitchNetwork, loading }) {
  const isCorrectChain = chainId === EXPECTED_CHAIN

  return (
    <div className="mb-6 sm:mb-8">
      {account ? (
        <div className="space-y-3">
          {/* Wallet status */}
          <div className="flex items-center justify-between p-3 rounded-sm bg-[rgba(240,240,250,0.02)] border border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <div className="min-w-0">
                <p className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase">
                  Connected
                </p>
                <p className="text-[#f0f0fa] font-body text-xs sm:text-sm truncate">
                  {formatAddress(account)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase">
                  Chain
                </p>
                <p className={`font-body text-[10px] sm:text-xs ${isCorrectChain ? 'text-green-500' : 'text-red-500'}`}>
                  {chainId === 5003 ? 'Mantle Sepolia' : chainId === 31337 ? 'Anvil' : `Chain ${chainId}`}
                </p>
              </div>
              <button
                onClick={onDisconnect}
                className="text-[#f0f0fa]/30 hover:text-red-500 transition-colors duration-200 ml-1 p-1"
                title="Disconnect"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="w-full py-2.5 px-4 border border-red-500/30 bg-red-500/5 text-red-500 font-body text-xs press-scale transition-all duration-200 hover:bg-red-500/10 disabled:opacity-50 tracking-wider uppercase"
            >
              Switch to Mantle Sepolia
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={loading}
          className="w-full py-3 px-4 bg-[rgba(240,240,250,0.02)] hover:bg-[rgba(240,240,250,0.05)] border border-white/[0.08] text-[#f0f0fa] font-body text-xs sm:text-sm press-scale transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed tracking-wider uppercase"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
