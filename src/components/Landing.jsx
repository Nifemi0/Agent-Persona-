export default function Landing({ onEnter }) {
  return (
    <div className="min-h-screen bg-[#000] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 border border-white/20 flex items-center justify-center">
            <span className="text-[#f0f0fa] font-body text-[10px] sm:text-[11px] tracking-[0.2em]">PR</span>
          </div>
          <span className="text-[#f0f0fa]/40 font-body text-[8px] sm:text-[10px] tracking-[0.15em] uppercase truncate">
            Agent Identity Registry
          </span>
        </div>
        <span className="text-[#f0f0fa]/20 font-body text-[8px] sm:text-[9px] tracking-[0.15em] uppercase shrink-0">
          Mantle Sepolia
        </span>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 mb-8 sm:mb-10">
            <span className="w-1.5 h-1.5 bg-[#f0f0fa]/60 rounded-full" />
            <span className="text-[#f0f0fa]/40 font-body text-[8px] sm:text-[9px] tracking-[0.2em] uppercase">
              ERC-8004 Aligned
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[clamp(24px,6vw,52px)] font-heading tracking-[0.08em] leading-[1.15] text-[#f0f0fa] mb-5 sm:mb-6">
            Every Agent<br />
            <span className="text-[#f0f0fa]/60">Deserves a Name</span>
          </h1>

          {/* Description */}
          <p className="text-[#f0f0fa]/40 font-body text-[12px] sm:text-[13px] leading-[1.8] tracking-[0.02em] max-w-lg mx-auto mb-10 sm:mb-12 px-2">
            Before autonomous agents can build reputation, trust, and economies,
            they need identity. A verifiable, persistent on-chain record that
            proves who they are and who controls them.
          </p>

          {/* Stats — stack on mobile, row on tablet+ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-12 sm:mb-14">
            <div className="text-center w-full sm:w-auto sm:px-6">
              <span className="block text-[#f0f0fa] font-heading text-lg sm:text-xl tracking-[0.05em]">1</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[8px] sm:text-[9px] tracking-[0.2em] uppercase mt-1">Click Register</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/5 self-center" />
            <div className="sm:hidden w-8 h-px bg-white/5" />
            <div className="text-center w-full sm:w-auto sm:px-6">
              <span className="block text-[#f0f0fa] font-heading text-lg sm:text-xl tracking-[0.05em]">Soulbound</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[8px] sm:text-[9px] tracking-[0.2em] uppercase mt-1">ERC-721 Identity</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/5 self-center" />
            <div className="sm:hidden w-8 h-px bg-white/5" />
            <div className="text-center w-full sm:w-auto sm:px-6">
              <span className="block text-[#f0f0fa] font-heading text-lg sm:text-xl tracking-[0.05em]">IPFS</span>
              <span className="block text-[#f0f0fa]/30 font-body text-[8px] sm:text-[9px] tracking-[0.2em] uppercase mt-1">Signed Metadata</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="group relative px-8 sm:px-10 py-3.5 sm:py-4 rounded border border-[#f0f0fa]/20 text-[#f0f0fa] font-body text-[10px] sm:text-[11px] tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#f0f0fa]/40 hover:bg-[#f0f0fa]/[0.03] active:scale-[0.97]"
          >
            <span className="relative z-10">Enter Registry</span>
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="absolute inset-0 shadow-[inset_0_0_30px_rgba(240,240,250,0.03)]" />
            </span>
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1">
        <span className="text-[#f0f0fa]/20 font-body text-[7px] sm:text-[9px] tracking-[0.15em] uppercase">
          Mantle Turing Test Hackathon 2026
        </span>
        <span className="text-[#f0f0fa]/20 font-body text-[7px] sm:text-[9px] tracking-[0.15em] uppercase">
          On-Chain Identity Protocol
        </span>
      </div>
    </div>
  )
}
