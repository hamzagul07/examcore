/**
 * Inline SVG illustrations used in empty states across the app.
 *
 * Constraints:
 *   - No external assets. Everything ships in the JS bundle.
 *   - Paper palette — examiner red accents on warm ivory surfaces.
 *   - ~150-200px in their intended size, but scale via viewBox.
 *   - Decorative — wrap consumers in proper aria-* attributes.
 */

type Props = {
  /** Optional pixel width. Height scales from the viewBox aspect ratio. */
  size?: number
  className?: string
}

export type IllustrationVariant =
  | 'no-attempts'
  | 'no-data'
  | 'loading'
  | 'success'

export function EmptyStateIllustration({
  variant,
  size = 160,
  className,
}: Props & { variant: IllustrationVariant }) {
  switch (variant) {
    case 'no-attempts':
      return <NoAttempts size={size} className={className} />
    case 'no-data':
      return <NoData size={size} className={className} />
    case 'loading':
      return <Loading size={size} className={className} />
    case 'success':
      return <Success size={size} className={className} />
  }
}

/** Paper + pencil + tick — used when there are no marked answers yet. */
function NoAttempts({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="ea-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="100%" stopColor="#f2ead9" />
        </linearGradient>
        <linearGradient id="ea-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2473f" />
          <stop offset="100%" stopColor="#bb2a25" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="#bb2a25" fillOpacity="0.05" />
      <circle cx="100" cy="100" r="58" fill="#bb2a25" fillOpacity="0.07" />
      <g transform="rotate(-6 100 100)">
        <rect
          x="56"
          y="48"
          width="88"
          height="108"
          rx="10"
          fill="url(#ea-paper)"
          stroke="#ddd2bd"
          strokeWidth="1.2"
        />
        <line x1="68" y1="68" x2="124" y2="68" stroke="#ddd2bd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="82" x2="132" y2="82" stroke="#ddd2bd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="96" x2="116" y2="96" stroke="#ddd2bd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="110" x2="128" y2="110" stroke="#ddd2bd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="124" x2="108" y2="124" stroke="#ddd2bd" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M114 132 l8 7 l16 -18"
          stroke="url(#ea-brand)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <g transform="rotate(28 156 60)">
        <rect x="142" y="42" width="32" height="9" rx="2" fill="#e0892b" />
        <rect x="170" y="42" width="6" height="9" fill="#b06d18" />
        <polygon points="176,42 184,46.5 176,51" fill="#8a7f70" />
        <rect x="142" y="42" width="4" height="9" fill="#bb2a25" />
      </g>
      <g fill="#bb2a25">
        <circle cx="48" cy="58" r="2.5" />
        <circle cx="156" cy="146" r="2" />
        <circle cx="40" cy="138" r="1.5" />
      </g>
    </svg>
  )
}

/** Rising bar chart — used for "no data yet" on analytics surfaces. */
function NoData({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="nd-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#bb2a25" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#bb2a25" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="#bb2a25" fillOpacity="0.04" />
      <line x1="44" y1="148" x2="156" y2="148" stroke="#ddd2bd" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="56" y="120" width="20" height="28" rx="4" fill="url(#nd-bar)" opacity="0.45" />
      <rect x="84" y="96" width="20" height="52" rx="4" fill="url(#nd-bar)" opacity="0.7" />
      <rect x="112" y="72" width="20" height="76" rx="4" fill="url(#nd-bar)" />
      <polyline
        points="66,108 94,80 122,52 150,38"
        stroke="#8f1f1c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="3 4"
      />
      <circle cx="150" cy="38" r="5" fill="#bb2a25" />
      <circle cx="150" cy="38" r="9" fill="#bb2a25" opacity="0.12" />
    </svg>
  )
}

/** Animated geometric loader — three pulsing dots. */
function Loading({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={className}
    >
      <style>{`
        @keyframes ldr-pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.4; }
          50%      { transform: scale(1);   opacity: 1;   }
        }
        .ldr-dot { transform-origin: center; animation: ldr-pulse 1.2s ease-in-out infinite; }
        .ldr-1 { animation-delay: 0s; }
        .ldr-2 { animation-delay: 0.2s; }
        .ldr-3 { animation-delay: 0.4s; }
      `}</style>
      <circle cx="100" cy="100" r="78" fill="#bb2a25" fillOpacity="0.04" />
      <g transform="translate(60 100)">
        <circle className="ldr-dot ldr-1" cx="0" cy="0" r="10" fill="#e2473f" />
      </g>
      <g transform="translate(100 100)">
        <circle className="ldr-dot ldr-2" cx="0" cy="0" r="10" fill="#bb2a25" />
      </g>
      <g transform="translate(140 100)">
        <circle className="ldr-dot ldr-3" cx="0" cy="0" r="10" fill="#8f1f1c" />
      </g>
    </svg>
  )
}

/** Stamp-style tick — used after successful actions. */
function Success({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="su-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2473f" />
          <stop offset="100%" stopColor="#bb2a25" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="#bb2a25" fillOpacity="0.06" />
      <circle cx="100" cy="100" r="56" fill="url(#su-brand)" />
      <path
        d="M76 102 l16 16 l32 -38"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <g>
        <rect x="40" y="46" width="6" height="6" rx="1.5" fill="#bb2a25" transform="rotate(20 43 49)" />
        <rect x="150" y="60" width="6" height="6" rx="1.5" fill="#8350d4" transform="rotate(-15 153 63)" />
        <rect x="36" y="138" width="6" height="6" rx="1.5" fill="#e0892b" transform="rotate(35 39 141)" />
        <rect x="160" y="140" width="6" height="6" rx="1.5" fill="#2d6bd4" transform="rotate(-20 163 143)" />
        <circle cx="56" cy="92" r="2.5" fill="#2f6b4f" />
        <circle cx="148" cy="106" r="2.5" fill="#8350d4" />
      </g>
    </svg>
  )
}
