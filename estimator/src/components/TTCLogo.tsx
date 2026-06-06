interface TTCLogoProps {
  size?: number
  variant?: 'icon' | 'full'
  darkText?: boolean
}

export default function TTCLogo({ size = 40, variant = 'icon', darkText = false }: TTCLogoProps) {
  const w = size
  const h = Math.round(size * 1.5)

  const icon = (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Top Trade Contractor logo"
    >
      <defs>
        <linearGradient id="ttc-bg" x1="0" y1="0" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0f0d2e" />
        </linearGradient>
        <linearGradient id="ttc-gold" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="ttc-helmet" x1="0" y1="20" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ttc-face" x1="0" y1="55" x2="0" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
        <filter id="ttc-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ttc-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background panel */}
      <rect x="0" y="0" width="80" height="120" rx="10" fill="url(#ttc-bg)" />

      {/* ── RULER (top) ── */}
      <rect x="0" y="0" width="80" height="20" rx="0" fill="url(#ttc-gold)" />
      <rect x="0" y="17" width="80" height="3" fill="#92400e" />
      {/* Tick marks */}
      {[8,16,24,32,40,48,56,64,72].map((x, i) => (
        <line key={x} x1={x} y1="0" x2={x} y2={i % 2 === 0 ? 11 : 7} stroke="#78350f" strokeWidth="1.5" />
      ))}
      {/* Numbers at 1/4, 1/2, 3/4 */}
      <text x="20" y="16" fontSize="5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">1</text>
      <text x="40" y="16" fontSize="5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">2</text>
      <text x="60" y="16" fontSize="5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">3</text>

      {/* ── HARD HAT ── */}
      {/* Helmet dome (main shape) — apex meets ruler at y=20 */}
      <path
        d="M12 88 Q12 26 40 20 Q68 26 68 88 Z"
        fill="url(#ttc-helmet)"
        filter="url(#ttc-shadow)"
      />
      {/* Helmet brim */}
      <rect x="8" y="86" width="64" height="12" rx="6" fill="#d97706" />
      <rect x="8" y="86" width="64" height="4" rx="0" fill="#f59e0b" />

      {/* Helmet front face plate / visor */}
      <rect x="22" y="55" width="36" height="32" rx="5" fill="url(#ttc-face)" />
      <rect x="22" y="55" width="36" height="2" rx="0" fill="#4338ca" opacity="0.6" />

      {/* AI text on helmet face — glowing gold */}
      <text
        x="40"
        y="77"
        fontSize="17"
        fontWeight="900"
        fill="#fcd34d"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        letterSpacing="-0.5"
        filter="url(#ttc-glow)"
      >
        AI
      </text>

      {/* Helmet vent stripe */}
      <rect x="37" y="22" width="6" height="14" rx="2" fill="#b45309" opacity="0.6" />

      {/* ── TTC label ── */}
      <text
        x="40"
        y="112"
        fontSize="13"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        letterSpacing="2"
      >
        TTC
      </text>

      {/* Amber underline accent */}
      <line x1="16" y1="116" x2="64" y2="116" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
    </svg>
  )

  if (variant === 'icon') return icon

  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="leading-none">
        <div
          className={`font-black leading-tight tracking-tight ${darkText ? 'text-gray-900' : 'text-white'}`}
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          Top Trade
        </div>
        <div
          className="font-black leading-tight tracking-tight text-amber-400"
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          Contractor
        </div>
        <div
          className={`font-semibold leading-tight tracking-widest uppercase ${darkText ? 'text-gray-400' : 'text-indigo-300'}`}
          style={{ fontSize: Math.round(size * 0.22) }}
        >
          AI Estimator
        </div>
      </div>
    </div>
  )
}
