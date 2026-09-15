export default function LogoHeader() {
    return (
      <div className="flex items-center gap-2.5">
        <svg 
          width="34" 
          height="34" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-auto h-[34px]"
        >
          {/* Emblema do aperto de mão totalmente vetorizado e nítido */}
          <path 
            d="M50 15L80 35V65L50 85L20 65V35L50 15Z" 
            stroke="#10B981" 
            strokeWidth="6" 
            strokeLinejoin="round" 
          />
          <path 
            d="M35 45L50 60L65 45M35 55L50 70L65 55" 
            stroke="#10B981" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
        <span className="text-xl font-black text-slate-900 tracking-tight">
          DeuAcordo<span className="text-emerald-500">.com</span>
        </span>
      </div>
    )
  }