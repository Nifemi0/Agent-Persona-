import { useState, useEffect, useCallback } from 'react'
import { connectWallet, formatAddress, createPersona, verifyByAgentId, verifyByName, getAgentRegistry } from './lib/registry'
import Header from './components/Header'
import WalletInfo from './components/WalletInfo'
import Landing from './components/Landing'
import { NETWORK } from './lib/contract-addresses'

const MODE_LANDING = 'landing'
const MODE_CREATE = 'create'
const MODE_VERIFY = 'verify'

const STATUS_IDLE = 'idle'
const STATUS_UPLOADING = 'uploading'
const STATUS_REGISTERING = 'registering'
const STATUS_DONE = 'done'
const STATUS_ERROR = 'error'

const STATUS_LABELS = {
  [STATUS_UPLOADING]: 'Processing persona...',
  [STATUS_REGISTERING]: 'Registering on chain...',
}

export default function App() {
  const [mode, setMode] = useState(MODE_LANDING)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [connecting, setConnecting] = useState(false)

  // Create flow
  const [name, setName] = useState('')
  const [status, setStatus] = useState(STATUS_IDLE)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Social link inputs
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [github, setGithub] = useState('')

  // Verify flow
  const [verifyInput, setVerifyInput] = useState('')
  const [verifyMode, setVerifyMode] = useState('name')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      const addr = await connectWallet()
      setAccount(addr)
      const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum)
      const net = await provider.getNetwork()
      setChainId(Number(net.chainId))
    } catch (err) {
      console.error(err)
    } finally {
      setConnecting(false)
    }
  }, [])

  // Detect existing wallet
  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts) => {
      if (!accounts.length) return
      setAccount(accounts[0])
      try {
        const { ethers } = await import('ethers')
        const provider = new ethers.BrowserProvider(window.ethereum)
        const net = await provider.getNetwork()
        setChainId(Number(net.chainId))
      } catch {}
    })
  }, [])

  const MANTLE_SEPOLIA = {
    chainId: '0x138B',
    chainName: NETWORK.NAME,
    rpcUrls: [NETWORK.RPC_URL],
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    blockExplorerUrls: [NETWORK.EXPLORER],
  }

  const handleSwitchNetwork = useCallback(async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_SEPOLIA.chainId }],
      })
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MANTLE_SEPOLIA],
        })
      }
    }
  }, [])

  // Listen for wallet changes
  useEffect(() => {
    if (!window.ethereum) return
    const handleAccounts = (accounts) => {
      setAccount(accounts[0] || null)
      if (!accounts[0]) { resetCreate(); setResult(null) }
    }
    const handleChain = () => window.location.reload()
    window.ethereum.on('accountsChanged', handleAccounts)
    window.ethereum.on('chainChanged', handleChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts)
      window.ethereum.removeListener('chainChanged', handleChain)
    }
  }, [])

  function resetCreate() {
    setStatus(STATUS_IDLE)
    setError(null)
    setResult(null)
    setWebsite('')
    setTwitter('')
    setGithub('')
  }

  async function handleDisconnect() {
    setAccount(null)
    setChainId(null)
    setName('')
    resetCreate()
    setVerifyInput('')
    setVerifyResult(null)
    setVerifyError(null)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setResult(null)
    setStatus(STATUS_UPLOADING)
    try {
      const result = await createPersona(name.trim(), website.trim(), twitter.trim(), github.trim())
      setResult(result)
      setStatus(STATUS_DONE)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStatus(STATUS_ERROR)
    }
  }

  async function handleVerify() {
    if (!verifyInput.trim()) return
    setVerifyLoading(true)
    setVerifyError(null)
    setVerifyResult(null)
    try {
      let data
      if (verifyMode === 'id') {
        data = await verifyByAgentId(Number(verifyInput.trim()))
      } else {
        data = await verifyByName(verifyInput.trim())
      }
      setVerifyResult(data)
    } catch (err) {
      setVerifyError(err.message || 'Verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  // Show landing page first
  if (mode === MODE_LANDING) {
    return <Landing onEnter={() => setMode(MODE_CREATE)} />
  }

  const tabs = [
    { id: MODE_CREATE, label: 'Register Agent' },
    { id: MODE_VERIFY, label: 'Verify Agent' },
  ]

  const ghostBorder = 'border border-white/[0.08]'
  const ghostInput = 'w-full px-4 py-3 bg-[rgba(240,240,250,0.02)] border border-white/[0.08] text-[#f0f0fa] font-body text-sm placeholder:text-[#f0f0fa]/20 focus:outline-none focus:border-white/20 focus:shadow-[0_0_12px_rgba(240,240,250,0.04)] transition-all duration-200'
  const ghostLabel = 'block text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase mb-2'
  const ghostBtn = 'w-full py-3 rounded border border-white/[0.12] text-[#f0f0fa] font-body text-xs tracking-wider uppercase press-scale transition-all duration-200 hover:bg-[rgba(240,240,250,0.03)] hover:border-white/[0.2] disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]'
  const ghostPrimaryBtn = 'w-full py-3 rounded bg-[#f0f0fa] text-[#000] font-body text-xs tracking-wider uppercase font-bold press-scale transition-all duration-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]'

  return (
    <div className="min-h-screen bg-[#000] scanlines">
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Header />

        {/* Tab Nav */}
        <div className="flex border-b border-white/[0.08] mb-5 sm:mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); resetCreate() }}
              className={`flex-1 pb-3 text-[10px] sm:text-[11px] tracking-wider uppercase font-body font-bold transition-all duration-200 relative ${
                mode === tab.id ? 'text-[#f0f0fa]' : 'text-[#f0f0fa]/30 hover:text-[#f0f0fa]/60'
              }`}
            >
              {tab.label}
              {mode === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-[#f0f0fa] shadow-[0_0_6px_rgba(240,240,250,0.2)]" />
              )}
            </button>
          ))}
        </div>

        {/* Wallet */}
        <WalletInfo account={account} chainId={chainId} onConnect={handleConnect} onDisconnect={handleDisconnect} onSwitchNetwork={handleSwitchNetwork} loading={connecting} />

        {/* ====== CREATE MODE ====== */}
        {mode === MODE_CREATE && (
          <div className="space-y-5">
            {status === STATUS_IDLE && (
              <div className={`p-4 sm:p-5 ${ghostBorder} space-y-4`}>
                <div>
                  <label className={ghostLabel}>
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. persona-alice-v1"
                    className={ghostInput}
                    autoFocus
                  />
                </div>

                {/* Social links */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className={ghostLabel}>
                    Endpoints (optional)
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Website URL"
                      className={ghostInput}
                    />
                    <input
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="Twitter / X handle"
                      className={ghostInput}
                    />
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="GitHub profile or repo"
                      className={ghostInput}
                    />
                  </div>
                </div>

                <button
                  onClick={chainId !== NETWORK.CHAIN_ID && account ? handleSwitchNetwork : handleCreate}
                  disabled={!name.trim() || !account}
                  className={ghostPrimaryBtn}
                >
                  {!account
                    ? 'Connect Wallet First'
                    : chainId !== NETWORK.CHAIN_ID
                      ? `Switch to ${NETWORK.NAME}`
                      : 'Register Agent'}
                </button>
              </div>
            )}

            {/* Progress */}
            {[STATUS_UPLOADING, STATUS_REGISTERING].includes(status) && (
              <div className={`p-6 sm:p-8 ${ghostBorder} flex flex-col items-center gap-4`}>
                <span className="inline-block w-6 h-6 sm:w-8 sm:h-8 border border-white/20 border-t-[#f0f0fa] rounded-full animate-spin" />
                <p className="text-[#f0f0fa]/60 font-body text-xs sm:text-sm">
                  {STATUS_LABELS[status]}
                </p>
              </div>
            )}

            {/* Error */}
            {status === STATUS_ERROR && (
              <div className={`p-4 sm:p-5 border border-red-500/30 space-y-4`}>
                <div className="p-3 border border-red-500/20 bg-red-500/5">
                  <p className="text-red-500 text-xs font-body break-all">{error}</p>
                </div>
                <button
                  onClick={resetCreate}
                  className={ghostPrimaryBtn}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Success */}
            {status === STATUS_DONE && result && (
              <div className={`p-4 sm:p-5 border border-green-500/30 space-y-5`}>
                <div className="flex justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-green-500/40 bg-green-500/10 flex items-center justify-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-base sm:text-lg font-heading text-[#f0f0fa] tracking-wider text-glow">
                    Agent Registered
                  </h3>
                  <p className="text-[#f0f0fa]/30 font-body text-[10px] sm:text-xs mt-1">
                    Agent ID #{result.agentId} — ERC-8004 aligned
                  </p>
                </div>

                <div className={`p-4 ${ghostBorder} space-y-2 text-xs sm:text-sm`}>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Agent ID</span>
                    <span className="text-[#f0f0fa] font-body font-bold text-right">#{result.agentId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Name</span>
                    <span className="text-[#f0f0fa] font-body text-right break-all max-w-[60%]">{result.metadata?.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Registry</span>
                    <span className="text-[#f0f0fa]/40 font-body text-[9px] break-all max-w-[60%] text-right">{result.agentRegistry}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Owner</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(result.address)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Tx Hash</span>
                    <span className="text-[#f0f0fa]/40 font-body break-all max-w-[60%] text-right">{result.txHash.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Block</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{result.blockNumber}</span>
                  </div>
                </div>

                {/* Reputation */}
                <div className={`p-3 ${ghostBorder}`}>
                  <p className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase mb-2 text-center">
                    Reputation
                  </p>
                  <div className="flex justify-center gap-6 sm:gap-8">
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[8px] tracking-wider uppercase">Interactions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[8px] tracking-wider uppercase">Attestations</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[8px] tracking-wider uppercase">Score</span>
                    </div>
                  </div>
                </div>

                {/* ERC-8004 badge */}
                <div className={`p-3 ${ghostBorder} text-center`}>
                  <p className="text-[#f0f0fa]/30 font-body text-[9px] tracking-wider uppercase">
                    ERC-8004 • Persona Registered on Mantle Sepolia
                  </p>
                </div>

                <a
                  href={result.ipfsGatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-[#f0f0fa]/50 hover:text-[#f0f0fa] text-[10px] tracking-wider uppercase font-body underline transition-colors duration-200"
                >
                  View Registration File on IPFS
                </a>

                <button
                  onClick={() => { resetCreate(); setName('') }}
                  className={ghostPrimaryBtn}
                >
                  Register Another Agent
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== VERIFY MODE ====== */}
        {mode === MODE_VERIFY && (
          <div className={`p-4 sm:p-5 ${ghostBorder} space-y-4`}>
            {/* Verify mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setVerifyMode('name')}
                className={`px-3 py-1.5 rounded text-[9px] tracking-wider uppercase font-body font-bold transition-all ${
                  verifyMode === 'name'
                    ? 'bg-[rgba(240,240,250,0.1)] text-[#f0f0fa] border border-white/20'
                    : 'text-[#f0f0fa]/30 border border-white/[0.06] hover:text-[#f0f0fa]/60'
                }`}
              >
                By Name
              </button>
              <button
                onClick={() => setVerifyMode('id')}
                className={`px-3 py-1.5 rounded text-[9px] tracking-wider uppercase font-body font-bold transition-all ${
                  verifyMode === 'id'
                    ? 'bg-[rgba(240,240,250,0.1)] text-[#f0f0fa] border border-white/20'
                    : 'text-[#f0f0fa]/30 border border-white/[0.06] hover:text-[#f0f0fa]/60'
                }`}
              >
                By Agent ID
              </button>
            </div>

            <div>
              <label className={ghostLabel}>
                {verifyMode === 'name' ? 'Agent Name' : 'Agent ID (number)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder={verifyMode === 'name' ? 'e.g. persona-alice-v1' : 'e.g. 1'}
                  className={`flex-1 ${ghostInput}`}
                />
                <button
                  onClick={handleVerify}
                  disabled={verifyLoading || !verifyInput.trim()}
                  className="px-4 sm:px-5 py-3 rounded bg-[#f0f0fa] text-[#000] font-body text-xs tracking-wider uppercase font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] shrink-0"
                >
                  {verifyLoading ? (
                    <span className="inline-block w-4 h-4 border border-black/20 border-t-black rounded-full animate-spin" />
                  ) : 'Verify'}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 border border-red-500/30 bg-red-500/5">
                <p className="text-red-500 text-xs font-body">{verifyError}</p>
              </div>
            )}

            {verifyResult && !verifyResult.exists && (
              <div className={`p-4 ${ghostBorder} text-center py-6`}>
                <p className="text-[#f0f0fa]/30 font-body text-xs sm:text-sm">
                  No agent found
                </p>
              </div>
            )}

            {verifyResult && verifyResult.exists && (
              <div className={`p-4 ${ghostBorder} space-y-3`}>
                <p className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase">Agent Data</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Agent ID</span>
                    <span className="text-[#f0f0fa] font-body font-bold text-right">#{verifyResult.agentId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Owner</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(verifyResult.owner)}</span>
                  </div>
                  {verifyResult.metadata?.name && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Name</span>
                      <span className="text-[#f0f0fa] font-body text-right break-all max-w-[60%]">{verifyResult.metadata.name}</span>
                    </div>
                  )}
                  {verifyResult.wallet && verifyResult.wallet !== '0x0000000000000000000000000000000000000000' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Payment Wallet</span>
                      <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(verifyResult.wallet)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase shrink-0">Standard</span>
                    <span className="text-[#f0f0fa] text-[9px] font-body text-right">ERC-8004</span>
                  </div>
                </div>

                {/* Reputation */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-[#f0f0fa]/60 font-body text-[9px] tracking-wider uppercase mb-2 text-center">
                    Reputation
                  </p>
                  <div className="flex justify-center gap-5">
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[7px] tracking-wider uppercase">Interactions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[7px] tracking-wider uppercase">Attestations</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 font-body text-[7px] tracking-wider uppercase">Score</span>
                    </div>
                  </div>
                </div>

                {verifyResult.agentURI && (
                  <a
                    href={verifyResult.agentURI.startsWith('ipfs://')
                      ? `https://gateway.pinata.cloud/ipfs/${verifyResult.agentURI.replace('ipfs://', '')}`
                      : verifyResult.agentURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-[#f0f0fa]/50 hover:text-[#f0f0fa] text-[9px] tracking-wider uppercase font-body underline transition-colors duration-200"
                  >
                    View Registration File on IPFS
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
