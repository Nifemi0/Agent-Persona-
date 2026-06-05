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
  const [verifyMode, setVerifyMode] = useState('name') // 'name' or 'id'
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
    chainId: '0x138B', // 5003
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

  return (
    <div className="min-h-screen bg-background scanlines">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Header />

        {/* Tab Nav */}
        <div className="flex border-b border-border/60 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); resetCreate() }}
              className={`flex-1 pb-3 text-[11px] tracking-wider uppercase font-body font-bold transition-all duration-200 relative ${
                mode === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground-secondary'
              }`}
            >
              {tab.label}
              {mode === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
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
              <div className="p-5 rounded-xl bg-surface/80 border border-border/50 backdrop-blur-sm space-y-4">
                <div>
                  <label className="block text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body">
                    Agent Name
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

                {/* Social links */}
                <div className="border-t border-border/30 pt-4">
                  <p className="text-foreground-secondary text-[11px] tracking-wider uppercase mb-3 font-body">
                    Endpoints (optional)
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Website URL"
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
                    />
                    <input
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="Twitter / X handle"
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
                    />
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="GitHub profile or repo"
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  onClick={chainId !== NETWORK.CHAIN_ID && account ? handleSwitchNetwork : handleCreate}
                  disabled={!name.trim() || !account}
                  className="w-full py-3 rounded-lg bg-accent text-white font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]"
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
              <div className="p-8 rounded-xl bg-surface/80 border border-border/50 backdrop-blur-sm flex flex-col items-center gap-4">
                <span className="inline-block w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="text-foreground-secondary text-sm font-body">
                  {STATUS_LABELS[status]}
                </p>
              </div>
            )}

            {/* Error */}
            {status === STATUS_ERROR && (
              <div className="p-5 rounded-xl bg-surface/80 border border-destructive/40 backdrop-blur-sm space-y-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-destructive text-xs font-body break-all">{error}</p>
                </div>
                <button
                  onClick={resetCreate}
                  className="w-full py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Success */}
            {status === STATUS_DONE && result && (
              <div className="p-5 rounded-xl bg-surface/80 border border-success/40 backdrop-blur-sm space-y-5">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 border border-success/40 flex items-center justify-center">
                    <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-heading text-foreground tracking-wider text-glow">
                    Agent Registered
                  </h3>
                  <p className="text-foreground-muted text-xs font-body mt-1">
                    Agent ID #{result.agentId} — ERC-8004 aligned
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Agent ID</span>
                    <span className="text-primary text-xs font-body font-bold">#{result.agentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Name</span>
                    <span className="text-foreground text-xs font-body">{result.metadata?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Registry</span>
                    <span className="text-foreground-muted text-[10px] font-body break-all max-w-[200px] text-right">{result.agentRegistry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Owner</span>
                    <span className="text-foreground-muted text-xs font-body">{formatAddress(result.address)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Tx Hash</span>
                    <span className="text-foreground-muted text-xs font-body break-all max-w-[150px] text-right">{result.txHash.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Block</span>
                    <span className="text-foreground-muted text-xs font-body">{result.blockNumber}</span>
                  </div>
                </div>

                {/* Reputation placeholder */}
                <div className="p-3 rounded-lg bg-surface-elevated/50 border border-border/40">
                  <p className="text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body text-center">
                    Reputation
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <span className="block text-foreground text-sm font-heading font-bold">0</span>
                      <span className="block text-foreground-muted text-[9px] tracking-wider uppercase font-body">Interactions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-foreground text-sm font-heading font-bold">0</span>
                      <span className="block text-foreground-muted text-[9px] tracking-wider uppercase font-body">Attestations</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-foreground text-sm font-heading font-bold">0</span>
                      <span className="block text-foreground-muted text-[9px] tracking-wider uppercase font-body">Score</span>
                    </div>
                  </div>
                </div>

                {/* ERC-8004 badge */}
                <div className="p-3 rounded-lg bg-surface-elevated/50 border border-border/40 text-center">
                  <p className="text-foreground-muted text-[10px] font-body tracking-wider uppercase">
                    ERC-8004 • Persona Registered on Mantle Sepolia
                  </p>
                </div>

                <a
                  href={result.ipfsGatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-primary/80 hover:text-primary text-[11px] tracking-wider uppercase font-body underline transition-colors duration-200"
                >
                  View Registration File on IPFS
                </a>

                <button
                  onClick={() => { resetCreate(); setName('') }}
                  className="w-full py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]"
                >
                  Register Another Agent
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== VERIFY MODE ====== */}
        {mode === MODE_VERIFY && (
          <div className="p-5 rounded-xl bg-surface/80 border border-border/50 backdrop-blur-sm space-y-4">
            {/* Verify mode toggle */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => setVerifyMode('name')}
                className={`px-3 py-1.5 text-[10px] tracking-wider uppercase font-body font-bold rounded-md transition-all ${
                  verifyMode === 'name'
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'text-foreground-muted border border-border/30 hover:text-foreground-secondary'
                }`}
              >
                By Name
              </button>
              <button
                onClick={() => setVerifyMode('id')}
                className={`px-3 py-1.5 text-[10px] tracking-wider uppercase font-body font-bold rounded-md transition-all ${
                  verifyMode === 'id'
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'text-foreground-muted border border-border/30 hover:text-foreground-secondary'
                }`}
              >
                By Agent ID
              </button>
            </div>

            <div>
              <label className="block text-foreground-secondary text-[11px] tracking-wider uppercase mb-2 font-body">
                {verifyMode === 'name' ? 'Agent Name' : 'Agent ID (number)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder={verifyMode === 'name' ? 'e.g. persona-alice-v1' : 'e.g. 1'}
                  className="flex-1 px-4 py-3 rounded-lg bg-surface border border-border/60 text-foreground font-body text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-all duration-200"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifyLoading || !verifyInput.trim()}
                  className="px-5 py-3 rounded-lg bg-primary text-background font-body text-sm font-bold press-scale transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                >
                  {verifyLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : 'Verify'}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-destructive text-xs font-body">{verifyError}</p>
              </div>
            )}

            {verifyResult && !verifyResult.exists && (
              <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 text-center py-6">
                <p className="text-foreground-muted text-sm font-body">
                  No agent found
                </p>
              </div>
            )}

            {verifyResult && verifyResult.exists && (
              <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/40 space-y-3">
                <p className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Agent Data</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Agent ID</span>
                    <span className="text-primary text-xs font-body font-bold">#{verifyResult.agentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Owner</span>
                    <span className="text-foreground-muted text-xs font-body">{formatAddress(verifyResult.owner)}</span>
                  </div>
                  {verifyResult.metadata?.name && (
                    <div className="flex justify-between">
                      <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Name</span>
                      <span className="text-foreground text-xs font-body">{verifyResult.metadata.name}</span>
                    </div>
                  )}
                  {verifyResult.wallet && verifyResult.wallet !== '0x0000000000000000000000000000000000000000' && (
                    <div className="flex justify-between">
                      <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Payment Wallet</span>
                      <span className="text-foreground-muted text-xs font-body">{formatAddress(verifyResult.wallet)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary text-[11px] tracking-wider uppercase font-body">Standard</span>
                    <span className="text-accent text-[10px] font-body">ERC-8004</span>
                  </div>
                </div>

                  {/* Reputation placeholder */}
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-foreground-secondary text-[10px] tracking-wider uppercase mb-2 font-body text-center">
                      Reputation
                    </p>
                    <div className="flex justify-center gap-5">
                      <div className="text-center">
                        <span className="block text-foreground text-sm font-heading font-bold">0</span>
                        <span className="block text-foreground-muted text-[8px] tracking-wider uppercase font-body">Interactions</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-foreground text-sm font-heading font-bold">0</span>
                        <span className="block text-foreground-muted text-[8px] tracking-wider uppercase font-body">Attestations</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-foreground text-sm font-heading font-bold">0</span>
                        <span className="block text-foreground-muted text-[8px] tracking-wider uppercase font-body">Score</span>
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
                      className="block text-center text-primary/80 hover:text-primary text-[10px] tracking-wider uppercase font-body underline transition-colors duration-200"
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
