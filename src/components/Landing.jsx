export default function Landing({ onEnter }) {
  return (
    <div className="min-h-screen bg-[#000] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
            <span className="text-[#f0f0fa] font-body text-[11px] tracking-[0.2em]">PR</span>
          </div>
          <span className="text-[#f0f0fa]/40 font-body text-[10px] tracking-[0.15em] uppercase">
            Agent Identity Registry
          </span>
        </div>
        <span className="text-[#f0f0fa]/20 font-body text-[9px] tracking-[0.15em] uppercase">
          Mantle Sepolia
        </span>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 mb-10">
            <span className="w-1.5 h-1.5 bg-[#f0f0fa]/60 rounded-full" />
            <span className="text-[#f0f0fa]/40 font-body text-[9px] tracking-[0.2em] uppercase">
              ERC-8004 Aligned
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[clamp(28px,5vw,52px)] font-heading tracking-[0.08em] leading-[1.15] text-[#f0f0fa] mb-6">
            Every Agent<br />
            <span className="text-[#f0f0fa]/60">Deserves a Name</span>
          </h1>

          {/* Description */}
          <p className="text-[#f0f0fa]/40 font-body text-[13px] leading-[1.8] tracking-[0.02em] max-w-lg mx-auto mb-12">
            Before autonomous agents can build reputation, trust, and economies,
            they need identity. A verifiable, persistent on-chain record that
            proves who they are and who controls them.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-12 mb-14">
            <div className="text-center">
              <span className="block text-[#f0f0fa] font-heading text-xl tracking-[0.05em]">1</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[9px] tracking-[0.2em] uppercase mt-1.5">Click Register</span>
            </div>
            <div className="w-px bg-white/5" />
            <div className="text-center">
              <span className="block text-[#f0f0fa] font-heading text-xl tracking-[0.05em]">Soulbound</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[9px] tracking-[0.2em] uppercase mt-1.5">ERC-721 Identity</span>
            </div>
            <div className="w-px bg-white/5" />
            <div className="text-center">
              <span className="block text-[#f0f0fa] font-heading text-xl tracking-[0.05em]">IPFS</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[9px] tracking-[0.2em] uppercase mt-1.5">Signed Metadata</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="group relative px-10 py-4 border border-[#f0f0fa]/20 text-[#f0f0fa] font-body text-[11px] tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#f0f0fa]/40 hover:bg-[#f0f0fa]/[0.03]"
          >
            <span className="relative z-10">Enter Registry</span>
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="absolute inset-0 shadow-[inset_0_0_30px_rgba(240,240,250,0.03)]" />
            </span>
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 px-6 py-3 flex items-center justify-between">
        <span className="text-[#f0f0fa]/20 font-body text-[9px] tracking-[0.15em] uppercase">
          Mantle Turing Test Hackathon 2026
        </span>
        <span className="text-[#f0f0fa]/20 font-body text-[9px] tracking-[0.15em] uppercase">
          On-Chain Identity Protocol
        </span>
      </div>
    </div>
  )
}
