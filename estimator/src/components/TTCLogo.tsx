interface TTCLogoProps {
  size?: number
  variant?: 'icon' | 'full'
  darkText?: boolean
}

export default function TTCLogo({ size = 40, variant = 'icon', darkText = false }: TTCLogoProps) {
  const h = Math.round(size * 1.12)

  const icon = (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Top Trade Contractor logo"
    >
      <defs>
        <linearGradient id="ttc-bg" x1="0" y1="0" x2="100" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#312e81" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="ttc-shine" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path d="M8 8H92V80Q50 110 50 110Q50 110 8 80Z" fill="url(#ttc-bg)" />
      {/* Amber top band */}
      <rect x="8" y="8" width="84" height="16" fill="url(#ttc-shine)" />
      {/* Hard hat dome */}
      <path d="M26 46Q26 26 50 24Q74 26 74 46L74 50L26 50Z" fill="url(#ttc-shine)" />
      {/* Hard hat brim */}
      <rect x="22" y="50" width="56" height="8" rx="4" fill="url(#ttc-shine)" />
      {/* TTC lettering */}
      <text
        x="50"
        y="79"
        fontSize="22"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        letterSpacing="1"
      >
        TTC
      </text>
    </svg>
  )

  if (variant === 'icon') return icon

  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="leading-none">
        <div
          className={`font-black leading-tight tracking-tight ${darkText ? 'text-gray-900' : 'text-white'}`}
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          Top Trade
        </div>
        <div
          className="font-black leading-tight tracking-tight text-amber-400"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          Contractor
        </div>
      </div>
    </div>
  )
}
