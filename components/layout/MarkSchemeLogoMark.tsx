/** Exam script with a bold handwritten examiner tick. */
export function MarkSchemeLogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-5 24 24)">
        <path
          d="M11 10.5 H31.5 C33.4 10.5 35 12.1 35 14 V31.5 C35 33.4 33.4 35 31.5 35 H17 L11 40.5 V35 C9.1 35 7.5 33.4 7.5 31.5 V14 C7.5 12.1 9.1 10.5 11 10.5 Z"
          fill="var(--ec-surface-raised)"
          stroke="var(--ec-brand)"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M29.5 10.5 H33.5 V15.5 L29.5 10.5 Z"
          fill="color-mix(in srgb, var(--ec-brand) 18%, var(--ec-canvas))"
          stroke="var(--ec-brand)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 19 H30 M14.5 23.5 H26"
          stroke="var(--ec-notebook-pencil)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M14 27.5 C16.8 33.2 20.8 32 24.2 29.2 C27.8 26.2 32 21.2 36.2 16"
          stroke="var(--ec-brand)"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="37" cy="15" r="2.25" fill="var(--ec-ink-crimson)" />
      </g>
    </svg>
  )
}
