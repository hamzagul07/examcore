import { cn } from '@/lib/utils'

type Props = {
  className?: string
  size?: number
}

/** Inline SVG spinner — uses currentColor, no extra dependencies. */
export function ButtonSpinner({ className, size = 16 }: Props) {
  return (
    <svg
      className={cn('animate-spin shrink-0', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  )
}
