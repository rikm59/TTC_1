interface TTCLogoProps {
  size?: number
  variant?: 'icon' | 'full'
  darkText?: boolean
}

export default function TTCLogo({ size = 40, variant = 'icon', darkText = false }: TTCLogoProps) {
  const w = size
  const h = Math.round(size * 1.1)

  const icon = (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Top Trade Contractor logo"
    >
      <defs>
        <linearGradient id="ttc-bg" x1="0" y1="0" x2="80" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0f0d2e" />
        </linearGradient>
        <linearGradient id="ttc-gold" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="ttc-helmet" x1="0" y1="15" x2="0" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ttc-face" x1="0" y1="40" x2="0" y2="64" gradientUnits="userSpaceOnUse">
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
      <rect x="0" y="0" width="80" height="88" rx="10" fill="url(#ttc-bg)" />

      {/* ── RULER (top) ── */}
      <rect x="0" y="0" width="80" height="15" rx="0" fill="url(#ttc-gold)" />
      <rect x="0" y="13" width="80" height="2" fill="#92400e" />
      {[8,16,24,32,40,48,56,64,72].map((x, i) => (
        <line key={x} x1={x} y1="0" x2={x} y2={i % 2 === 0 ? 8 : 5} stroke="#78350f" strokeWidth="1.5" />
      ))}
      <text x="20" y="11" fontSize="4.5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">1</text>
      <text x="40" y="11" fontSize="4.5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">2</text>
      <text x="60" y="11" fontSize="4.5" fill="#78350f" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700">3</text>

      {/* ── HARD HAT ── */}
      {/* Dome apex at y=15 — flush with ruler bottom */}
      <path
        d="M12 65 Q12 20 40 15 Q68 20 68 65 Z"
        fill="url(#ttc-helmet)"
        filter="url(#ttc-shadow)"
      />
      {/* Brim */}
      <rect x="8" y="63" width="64" height="9" rx="4.5" fill="#d97706" />
      <rect x="8" y="63" width="64" height="3" rx="0" fill="#f59e0b" />

      {/* Face plate */}
      <rect x="22" y="40" width="36" height="24" rx="4" fill="url(#ttc-face)" />
      <rect x="22" y="40" width="36" height="2" rx="0" fill="#4338ca" opacity="0.6" />

      {/* AI — glowing gold */}
      <text
        x="40"
        y="57"
        fontSize="14"
        fontWeight="900"
        fill="#fcd34d"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        letterSpacing="-0.5"
        filter="url(#ttc-glow)"
      >
        AI
      </text>

      {/* Vent stripe */}
      <rect x="37" y="17" width="6" height="10" rx="2" fill="#b45309" opacity="0.6" />

      {/* TTC label */}
      <text
        x="40"
        y="81"
        fontSize="11"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        letterSpacing="2"
      >
        TTC
      </text>

      {/* Amber underline */}
      <line x1="16" y1="85" x2="64" y2="85" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
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
