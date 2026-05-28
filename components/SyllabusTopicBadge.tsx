import {
  getSyllabusTopicByCode as get9709Topic,
  CAMBRIDGE_9709_SYLLABUS,
  type SyllabusCode,
} from '@/lib/syllabus'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

type Props = {
  code: SyllabusCode
  subjectCode?: string
  size?: 'sm' | 'md'
  /** If true, hide the topic name and only render the numeric code. */
  compact?: boolean
}

/**
 * Per-paper color wash — deliberately desaturated so the badges look like
 * sophisticated metadata rather than candy. Each paper's hue is the same
 * tonal family used in the Mastery Matrix legend.
 */
const paperColors: Record<string, string> = {
  P1: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  P2: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  P3: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  P4: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  P5: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  P6: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
}

export function SyllabusTopicBadge({
  code,
  subjectCode = '9709',
  size = 'sm',
  compact = false,
}: Props) {
  const topic =
    subjectCode === '9709'
      ? get9709Topic(code)
      : getSyllabusTopicByCode(subjectCode, code) ?? get9709Topic(code)
  if (!topic) return null

  const sizeClasses =
    size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight backdrop-blur transition-transform duration-200 hover:scale-[1.03] ${paperColors[topic.paper]} ${sizeClasses}`}
      title={`${topic.paperName} • ${topic.name}`}
    >
      <span className="font-mono opacity-60">{code}</span>
      {!compact && <span>{topic.name}</span>}
    </span>
  )
}

/**
 * Renders a horizontal list of badges with a "+N more" overflow chip.
 * Used wherever we have limited horizontal real estate (dashboard cards).
 */
export function SyllabusTopicBadgeList({
  codes,
  max = 2,
  size = 'sm',
}: {
  codes: SyllabusCode[]
  max?: number
  size?: 'sm' | 'md'
}) {
  if (!codes || codes.length === 0) return null

  const visible = codes.slice(0, max)
  const overflow = codes.length - visible.length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((code) => (
        <SyllabusTopicBadge key={code} code={code} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 font-medium text-slate-400 backdrop-blur ${
            size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
          }`}
          title={`${overflow} more topic${overflow === 1 ? '' : 's'}`}
        >
          +{overflow} more
        </span>
      )}
    </div>
  )
}
