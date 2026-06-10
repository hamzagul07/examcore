import { LOGO_COLORS } from '@/lib/brand/logo-mark'

type LogoMarkProps = {
  size?: number
  className?: string
  /** Slight stamp tilt for favicon-style presentation */
  tilt?: boolean
}

/** Canonical MarkScheme icon — paper script with examiner tick. */
export function LogoMark({ size = 32, className = '', tilt = false }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <g transform={tilt ? 'rotate(-4 16 16)' : 'translate(0 0)'}>
        <g transform="translate(4 3)">
          <path
            d="M2 2.5 H18.5 C19.88 2.5 21 3.62 21 5 V19.5 C21 20.88 19.88 22 18.5 22 H7.5 L2 26.5 V22 C0.62 22 -0.5 20.88 -0.5 19.5 V5 C-0.5 3.62 0.62 2.5 2 2.5 Z"
            fill={LOGO_COLORS.paper}
            stroke={LOGO_COLORS.brand}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 2.5 H19.5 V7 L15.5 2.5 Z"
            fill={LOGO_COLORS.paperFold}
            stroke={LOGO_COLORS.brand}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 10.5 H16 M4.5 13.5 H13"
            stroke={LOGO_COLORS.pencil}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M4.2 17.2 L8.2 21.2 L17.8 10.2"
            stroke={LOGO_COLORS.brand}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="18.4" cy="9.6" r="1.6" fill={LOGO_COLORS.brand} />
        </g>
      </g>
    </svg>
  )
}
