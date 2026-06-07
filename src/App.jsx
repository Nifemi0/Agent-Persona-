import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { connectWallet, formatAddress, signPersonaName, uploadMetadata, registerOnChain, assignAgentWallet, verifyByAgentId, verifyByName, getAgentRegistry } from './lib/registry'
import Header from './components/Header'
import WalletInfo from './components/WalletInfo'
import Landing from './components/Landing'
import StepIndicator from './components/StepIndicator'
import { NETWORK } from './lib/contract-addresses'

const MODE_LANDING = 'landing'
const MODE_CREATE = 'create'
const MODE_VERIFY = 'verify'

// Styling constants (mission-control aesthetic)
const ghostBorder = 'border border-white/[0.08]'
const ghostInput = 'w-full px-4 py-3 bg-[rgba(240,240,250,0.02)] border border-white/[0.08] text-[#f0f0fa] font-body text-sm placeholder:text-[#f0f0fa]/20 focus:outline-none focus:border-white/20 focus:shadow-[0_0_12px_rgba(240,240,250,0.04)] transition-all duration-200'
const ghostLabel = 'block text-[#f0f0fa]/60 font-body text-[10px] tracking-wider uppercase mb-2'
const ghostPrimaryBtn = 'w-full py-3 rounded bg-[#f0f0fa] text-[#000] font-body text-xs tracking-wider uppercase font-bold press-scale transition-all duration-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]'
const ghostOutlineBtn = 'w-full py-3 rounded border border-white/[0.12] text-[#f0f0fa] font-body text-xs tracking-wider uppercase press-scale transition-all duration-200 hover:bg-[rgba(240,240,250,0.03)] hover:border-white/[0.2] active:scale-[0.97]'

export default function App() {
  const [mode, setMode] = useState(MODE_LANDING)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [connecting, setConnecting] = useState(false)

  // Step flow
  const [step, setStep] = useState(1) // 1=Define, 2=Sign, 3=Upload, 4=Register, 5=Done
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [github, setGithub] = useState('')
  const [signature, setSignature] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Agent wallet assignment
  const [showWalletAssign, setShowWalletAssign] = useState(false)
  const [agentWalletAddr, setAgentWalletAddr] = useState('')
  const [walletAssignLoading, setWalletAssignLoading] = useState(false)
  const [walletAssignError, setWalletAssignError] = useState(null)
  const [walletAssignSuccess, setWalletAssignSuccess] = useState(null)

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
      const provider = new ethers.BrowserProvider(window.ethereum)
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
      if (!accounts[0]) { resetFlow(); setResult(null) }
    }
    const handleChain = () => window.location.reload()
    window.ethereum.on('accountsChanged', handleAccounts)
    window.ethereum.on('chainChanged', handleChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts)
      window.ethereum.removeListener('chainChanged', handleChain)
    }
  }, [])

  function resetFlow() {
    setStep(1)
    setName('')
    setWebsite('')
    setTwitter('')
    setGithub('')
    setSignature(null)
    setLoading(false)
    setLoadingLabel('')
    setError(null)
    setResult(null)
  }

  async function handleDisconnect() {
    setAccount(null)
    setChainId(null)
    resetFlow()
    setVerifyInput('')
    setVerifyResult(null)
    setVerifyError(null)
  }

  // ===== Step 1 → 2: Submit name, move to Sign =====
  function handleDefineNext() {
    if (!name.trim() || !account) return
    setStep(2)
  }

  // ===== Step 2 → 3→4→5: Sign → Upload → Register =====
  async function handleSignAndRegister() {
    setLoading(true)
    setError(null)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)

      // Step 2: Sign
      setStep(2)
      setLoadingLabel('Signing with MetaMask...')
      const sig = await signPersonaName(provider, name.trim())
      setSignature(sig)

      // Step 3: Upload to IPFS
      setStep(3)
      setLoadingLabel('Uploading to IPFS...')
      const accounts = await provider.send('eth_requestAccounts', [])
      const address = accounts[0]
      const upload = await uploadMetadata(name.trim(), address, sig, website.trim(), twitter.trim(), github.trim())

      // Step 4: Register on chain
      setStep(4)
      setLoadingLabel('Registering on Mantle Sepolia...')
      const signer = await provider.getSigner()
      const onChain = await registerOnChain(signer, upload.cid)

      // Step 5: Done
      setResult({
        agentId: onChain.agentId,
        cid: upload.cid,
        agentURI: onChain.agentURI,
        signature: sig,
        address,
        txHash: onChain.txHash,
        blockNumber: onChain.blockNumber,
        ipfsGatewayUrl: upload.gatewayUrl,
        metadata: upload.metadata,
        agentRegistry: onChain.agentRegistry,
      })
      setStep(5)
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setLoadingLabel('')
    }
  }

  // ===== Assign Agent Wallet =====
  async function handleAssignWallet() {
    if (!agentWalletAddr.trim() || !result) return
    setWalletAssignLoading(true)
    setWalletAssignError(null)
    setWalletAssignSuccess(null)
    try {
      const res = await assignAgentWallet(result.agentId, agentWalletAddr.trim())
      setWalletAssignSuccess(res)
      setShowWalletAssign(false)
    } catch (err) {
      setWalletAssignError(err.reason || err.message || 'Failed to assign wallet')
    } finally {
      setWalletAssignLoading(false)
    }
  }

  // ===== Verify =====
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
    <div className="min-h-screen bg-[#000] scanlines">
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Header />

        {/* Tab Nav */}
        <div className="flex border-b border-white/[0.08] mb-5 sm:mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); resetFlow() }}
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
            {/* Step Indicator */}
            <StepIndicator currentStep={step} />

            {/* ===== STEP 1: Define ===== */}
            {step === 1 && (
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
                  onClick={chainId !== NETWORK.CHAIN_ID && account ? handleSwitchNetwork : handleDefineNext}
                  disabled={!name.trim() || !account}
                  className={ghostPrimaryBtn}
                >
                  {!account
                    ? 'Connect Wallet First'
                    : chainId !== NETWORK.CHAIN_ID
                      ? `Switch to ${NETWORK.NAME}`
                      : 'Next — Sign'}
                </button>
              </div>
            )}

            {/* ===== STEP 2: Sign ===== */}
            {step === 2 && (
              <div className={`p-4 sm:p-5 ${ghostBorder} space-y-4`}>
                <div className={`p-4 ${ghostBorder} space-y-3`}>
                  <p className={ghostLabel}>
                    Message to Sign
                  </p>
                  <p className="text-[#f0f0fa] font-body text-sm sm:text-base break-all bg-[rgba(240,240,250,0.02)] p-3 border border-white/[0.06]">
                    {name.trim()}
                  </p>
                  <div className="flex items-center gap-2 text-[#f0f0fa]/40 text-xs font-body">
                    <span>Wallet:</span>
                    <span className="text-[#f0f0fa]/60">{formatAddress(account)}</span>
                  </div>
                  <p className="text-[#f0f0fa]/30 text-[10px] font-body leading-relaxed">
                    Sign this message to prove you own this wallet. No gas fee — it's a free signature.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 py-3 rounded border border-white/[0.12] text-[#f0f0fa] font-body text-xs tracking-wider uppercase press-scale transition-all duration-200 hover:bg-[rgba(240,240,250,0.03)] active:scale-[0.97] disabled:opacity-30"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSignAndRegister}
                    disabled={loading}
                    className="flex-[2] py-3 rounded bg-[#f0f0fa] text-[#000] font-body text-xs tracking-wider uppercase font-bold press-scale transition-all duration-200 hover:bg-white active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border border-black/20 border-t-black rounded-full animate-spin" />
                        {loadingLabel}
                      </span>
                    ) : 'Sign with MetaMask'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 3: Upload ===== */}
            {(step === 3) && (
              <div className={`p-8 ${ghostBorder} flex flex-col items-center gap-4`}>
                <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 border border-white/20 border-t-[#f0f0fa] rounded-full animate-spin" />
                <p className="text-[#f0f0fa]/60 font-body text-xs sm:text-sm">{loadingLabel}</p>
                {error && (
                  <div className="w-full p-3 border border-red-500/30 bg-red-500/5">
                    <p className="text-red-500 text-xs font-body break-all">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 4: Register ===== */}
            {(step === 4) && (
              <div className={`p-8 ${ghostBorder} flex flex-col items-center gap-4`}>
                <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 border border-white/20 border-t-[#f0f0fa] rounded-full animate-spin" />
                <p className="text-[#f0f0fa]/60 font-body text-xs sm:text-sm">{loadingLabel}</p>
                {error && (
                  <div className="w-full p-3 border border-red-500/30 bg-red-500/5">
                    <p className="text-red-500 text-xs font-body break-all">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== Error state (from steps 3-4) ===== */}
            {error && step >= 3 && step < 5 && (
              <div className={`p-4 sm:p-5 border border-red-500/30 space-y-4`}>
                <div className="p-3 border border-red-500/20 bg-red-500/5">
                  <p className="text-red-500 text-xs font-body break-all">{error}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetFlow} className={`flex-1 ${ghostOutlineBtn}`}>
                    Restart
                  </button>
                  <button
                    onClick={() => { setError(null); setStep(2) }}
                    className={`flex-[2] ${ghostPrimaryBtn}`}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* ===== STEP 5: Done ===== */}
            {step === 5 && result && (
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
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Agent ID</span>
                    <span className="text-[#f0f0fa] font-body font-bold text-right">#{result.agentId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Name</span>
                    <span className="text-[#f0f0fa] font-body text-right break-all max-w-[60%]">{result.metadata?.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Registry</span>
                    <span className="text-[#f0f0fa]/40 text-[9px] break-all max-w-[60%] text-right font-body">{result.agentRegistry}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Owner</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(result.address)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Tx Hash</span>
                    <span className="text-[#f0f0fa]/40 font-body break-all max-w-[60%] text-right">{result.txHash.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Block</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{result.blockNumber}</span>
                  </div>
                </div>

                {/* Reputation */}
                <div className={`p-3 ${ghostBorder}`}>
                  <p className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase mb-2 text-center font-body">
                    Reputation
                  </p>
                  <div className="flex justify-center gap-6 sm:gap-8">
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[8px] tracking-wider uppercase font-body">Interactions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[8px] tracking-wider uppercase font-body">Attestations</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-sm font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[8px] tracking-wider uppercase font-body">Score</span>
                    </div>
                  </div>
                </div>

                {/* ERC-8004 badge */}
                <div className={`p-3 ${ghostBorder} text-center`}>
                  <p className="text-[#f0f0fa]/30 text-[9px] tracking-wider uppercase font-body">
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

                <button onClick={resetFlow} className={ghostPrimaryBtn}>
                  Register Another Agent
                </button>

                {/* === Agent Wallet Assignment === */}
                <div className={`p-4 ${ghostBorder}`}>
                  <p className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase mb-3 font-body text-center">
                    Agent Wallet
                  </p>
                  <p className="text-[#f0f0fa]/30 text-[10px] font-body mb-3 text-center leading-relaxed">
                    Assign a wallet keypair to this agent so it can cryptographically prove its identity to other agents.
                  </p>

                  {!showWalletAssign && !walletAssignSuccess && (
                    <button
                      onClick={() => setShowWalletAssign(true)}
                      className={`w-full ${ghostOutlineBtn}`}
                    >
                      Assign Agent Wallet
                    </button>
                  )}

                  {showWalletAssign && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={agentWalletAddr}
                        onChange={(e) => setAgentWalletAddr(e.target.value)}
                        placeholder="0x... (agent wallet address)"
                        className={ghostInput}
                        autoFocus
                      />
                      {walletAssignError && (
                        <div className="p-3 border border-red-500/30 bg-red-500/5">
                          <p className="text-red-500 text-[10px] font-body break-all">{walletAssignError}</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowWalletAssign(false); setWalletAssignError(null) }}
                          disabled={walletAssignLoading}
                          className="flex-1 py-3 rounded border border-white/[0.12] text-[#f0f0fa] font-body text-[10px] tracking-wider uppercase press-scale transition-all duration-200 hover:bg-[rgba(240,240,250,0.03)] active:scale-[0.97] disabled:opacity-30"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAssignWallet}
                          disabled={!agentWalletAddr.trim() || walletAssignLoading}
                          className="flex-[2] py-3 rounded border border-white/[0.2] text-[#f0f0fa] font-body text-[10px] tracking-wider uppercase font-bold press-scale transition-all duration-200 hover:bg-[rgba(240,240,250,0.05)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {walletAssignLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block w-3 h-3 border border-white/20 border-t-[#f0f0fa] rounded-full animate-spin" />
                              Signing &amp; Submitting...
                            </span>
                          ) : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}

                  {walletAssignSuccess && (
                    <div className="text-center space-y-2">
                      <p className="text-green-500 text-[10px] font-body">
                        ✓ Agent wallet assigned
                      </p>
                      <p className="text-[#f0f0fa]/30 text-[9px] font-body break-all">
                        Tx: {walletAssignSuccess.txHash.slice(0, 30)}...
                      </p>
                    </div>
                  )}
                </div>
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
                <p className="text-[#f0f0fa]/30 text-xs sm:text-sm font-body">No agent found</p>
              </div>
            )}

            {verifyResult && verifyResult.exists && (
              <div className={`p-4 ${ghostBorder} space-y-3`}>
                <p className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase font-body">Agent Data</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Agent ID</span>
                    <span className="text-[#f0f0fa] font-body font-bold text-right">#{verifyResult.agentId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Owner</span>
                    <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(verifyResult.owner)}</span>
                  </div>
                  {verifyResult.metadata?.name && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Name</span>
                      <span className="text-[#f0f0fa] font-body text-right break-all max-w-[60%]">{verifyResult.metadata.name}</span>
                    </div>
                  )}
                  {verifyResult.wallet && verifyResult.wallet !== '0x0000000000000000000000000000000000000000' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Payment Wallet</span>
                      <span className="text-[#f0f0fa]/40 font-body text-right">{formatAddress(verifyResult.wallet)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-[#f0f0fa]/60 text-[10px] tracking-wider uppercase shrink-0 font-body">Standard</span>
                    <span className="text-[#f0f0fa] text-[9px] font-body text-right">ERC-8004</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-[#f0f0fa]/60 text-[9px] tracking-wider uppercase mb-2 text-center font-body">Reputation</p>
                  <div className="flex justify-center gap-5">
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[7px] tracking-wider uppercase font-body">Interactions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[7px] tracking-wider uppercase font-body">Attestations</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[#f0f0fa] font-heading text-xs font-bold">0</span>
                      <span className="block text-[#f0f0fa]/30 text-[7px] tracking-wider uppercase font-body">Score</span>
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
