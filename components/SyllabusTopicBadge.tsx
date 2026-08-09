import {
  getSyllabusTopicByCode as get9709Topic,
  type SyllabusCode,
} from '@/lib/syllabus'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

type Props = {
  code: SyllabusCode
  /** Cambridge subject code (e.g. 9701). Required for correct topic names. */
  subjectCode?: string
  size?: 'sm' | 'md'
  /** If true, hide the topic name and only render the numeric code. */
  compact?: boolean
}

/**
 * Paper / component tint — dual-ink only (green vs crimson), not a rainbow
 * of SaaS chip colors. Alternating papers use muted brand vs crimson wash.
 */
const paperColors: Record<string, string> = {
  P1: 'border-[color-mix(in_srgb,var(--ec-brand)_40%,var(--ec-border))] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]',
  P2: 'border-[color-mix(in_srgb,var(--ec-ink-crimson,#a23e3e)_35%,var(--ec-border))] bg-[var(--ec-chip-critical-bg)] text-[var(--ec-ink-crimson,#a23e3e)]',
  P3: 'border-[color-mix(in_srgb,var(--ec-brand)_40%,var(--ec-border))] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]',
  P4: 'border-[color-mix(in_srgb,var(--ec-ink-crimson,#a23e3e)_35%,var(--ec-border))] bg-[var(--ec-chip-critical-bg)] text-[var(--ec-ink-crimson,#a23e3e)]',
  P5: 'border-[color-mix(in_srgb,var(--ec-brand)_40%,var(--ec-border))] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]',
  P6: 'border-[color-mix(in_srgb,var(--ec-ink-crimson,#a23e3e)_35%,var(--ec-border))] bg-[var(--ec-chip-critical-bg)] text-[var(--ec-ink-crimson,#a23e3e)]',
  AS: 'border-[color-mix(in_srgb,var(--ec-brand)_40%,var(--ec-border))] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]',
  A2: 'border-[color-mix(in_srgb,var(--ec-ink-crimson,#a23e3e)_35%,var(--ec-border))] bg-[var(--ec-chip-critical-bg)] text-[var(--ec-ink-crimson,#a23e3e)]',
}

const FALLBACK_CHIP =
  'border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] text-[var(--ec-text-secondary)]'

function lookupTopic(
  subjectCode: string | undefined,
  code: SyllabusCode
): { paper: string; paperName: string; name: string } | null {
  if (!subjectCode) return null
  if (subjectCode === '9709') {
    return get9709Topic(code) ?? null
  }
  const topic = getSyllabusTopicByCode(subjectCode, code)
  return topic ?? null
}

const STAMP =
  'inline-flex items-center gap-1.5 rounded border font-mono text-[11px] font-semibold tracking-wide shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]'

export function SyllabusTopicBadge({
  code,
  subjectCode,
  size = 'sm',
  compact = false,
}: Props) {
  const topic = lookupTopic(subjectCode, code)
  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1 text-xs'

  if (!topic) {
    return (
      <span
        className={`${STAMP} ${FALLBACK_CHIP} ${sizeClasses}`}
        title={subjectCode ? `${subjectCode} • ${code}` : code}
      >
        <span className="opacity-80">{code}</span>
      </span>
    )
  }

  const chipClass = paperColors[topic.paper] ?? FALLBACK_CHIP

  return (
    <span
      className={`${STAMP} ${chipClass} ${sizeClasses}`}
      title={`${topic.paperName} • ${topic.name}`}
    >
      <span className="opacity-70">{code}</span>
      {!compact && (
        <span className="font-sans font-medium tracking-normal">{topic.name}</span>
      )}
    </span>
  )
}

/**
 * Renders a horizontal list of badges with a "+N more" overflow chip.
 * Used wherever we have limited horizontal real estate (dashboard cards).
 */
export function SyllabusTopicBadgeList({
  codes,
  subjectCode,
  max = 2,
  size = 'sm',
}: {
  codes: SyllabusCode[]
  subjectCode?: string
  max?: number
  size?: 'sm' | 'md'
}) {
  if (!codes || codes.length === 0) return null

  const visible = codes.slice(0, max)
  const overflow = codes.length - visible.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((code) => (
        <SyllabusTopicBadge
          key={code}
          code={code}
          subjectCode={subjectCode}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span
          className={`${STAMP} ${FALLBACK_CHIP} ${
            size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1 text-xs'
          }`}
          title={`${overflow} more topic${overflow === 1 ? '' : 's'}`}
        >
          +{overflow} more
        </span>
      )}
    </div>
  )
}
