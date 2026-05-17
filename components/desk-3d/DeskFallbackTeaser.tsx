'use client'

export function DeskFallbackTeaser({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 420"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="deskSurfaceFallback" x1="82" y1="55" x2="484" y2="365" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4A3020" />
          <stop offset="0.55" stopColor="#211913" />
          <stop offset="1" stopColor="#141418" />
        </linearGradient>
        <linearGradient id="moduleDarkFallback" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#15171C" />
          <stop offset="1" stopColor="#050608" />
        </linearGradient>
        <filter id="softGlowFallback" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.64 0 0 0 0 1 0 0 0 0 0.07 0 0 0 0.65 0" />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>
      <rect x="28" y="24" width="504" height="372" rx="26" fill="#0F0F14" stroke="rgba(255,255,255,0.12)" />
      <rect x="60" y="58" width="440" height="286" rx="18" fill="url(#deskSurfaceFallback)" stroke="rgba(255,255,255,0.16)" />
      <path d="M95 102H466M95 146H466M95 190H466M95 234H466M95 278H466" stroke="rgba(255,255,255,0.1)" />
      <path d="M118 82V321M174 82V321M230 82V321M286 82V321M342 82V321M398 82V321M454 82V321" stroke="rgba(255,255,255,0.08)" />
      <g filter="url(#softGlowFallback)">
        <rect x="122" y="118" width="84" height="44" rx="10" fill="url(#moduleDarkFallback)" stroke="#A3FF12" strokeWidth="2" />
        <rect x="140" y="128" width="28" height="24" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
        <circle cx="154" cy="140" r="8" stroke="#A3FF12" strokeWidth="3" />
        <path d="M178 139H196" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="356" cy="142" r="34" fill="url(#moduleDarkFallback)" stroke="rgba(255,255,255,0.2)" />
      <circle cx="356" cy="142" r="23" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.22)" />
      <path d="M344 127V155M356 123V159M368 130V151" stroke="#9A6A3D" strokeWidth="6" strokeLinecap="round" />
      <rect x="248" y="220" width="116" height="70" rx="12" fill="url(#moduleDarkFallback)" stroke="rgba(255,255,255,0.2)" />
      <rect x="263" y="235" width="86" height="40" rx="8" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.16)" />
      <path d="M335 236V274" stroke="#A3FF12" strokeWidth="7" strokeLinecap="round" />
      <rect x="414" y="222" width="48" height="78" rx="12" fill="url(#moduleDarkFallback)" stroke="rgba(255,255,255,0.22)" />
      <path d="M431 238V282" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
      <path d="M437 276C454 276 454 257 443 255" stroke="#38BDF8" strokeWidth="7" strokeLinecap="round" />
      <rect x="92" y="360" width="118" height="18" rx="9" fill="rgba(163,255,18,0.16)" stroke="rgba(163,255,18,0.34)" />
      <rect x="224" y="360" width="86" height="18" rx="9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <rect x="324" y="360" width="144" height="18" rx="9" fill="rgba(56,189,248,0.14)" stroke="rgba(56,189,248,0.28)" />
    </svg>
  )
}
