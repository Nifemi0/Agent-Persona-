export default function Header() {
  return (
    <div className="border-b border-white/[0.06] mb-6 -mx-4 sm:-mx-0 px-4 sm:px-0 pb-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 shrink-0 border border-white/20 flex items-center justify-center">
          <span className="text-[#f0f0fa] font-body text-[10px] tracking-[0.2em]">PR</span>
        </div>
        <span className="text-[#f0f0fa]/40 font-body text-[9px] tracking-[0.15em] uppercase truncate">
          Agent Identity Registry
        </span>
      </div>
      <span className="text-[#f0f0fa]/20 font-body text-[8px] tracking-[0.15em] uppercase shrink-0">
        Mantle Sepolia
      </span>
    </div>
  )
}
