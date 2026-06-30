import Link from 'next/link'
import { BOARD_LABELS, BOARDS, type Board } from '@/lib/content/taxonomy'

export type SubjectFacet = {
  value: string
  label: string
  href: string
  count: number
  core?: boolean
}
export type LevelFacet = { value: string; label: string; href: string; count: number }

type Props = {
  /** null = the "All boards" view (the /blog index) */
  activeBoard: Board | null
  /** null = the board's "all subjects" view */
  activeSubject: string | null
  /** null = the subject's "all levels" view */
  activeLevel?: string | null
  subjectOptions?: SubjectFacet[]
  /** IB Core (TOK/EE/CAS) rendered as a distinct group */
  coreOptions?: SubjectFacet[]
  /** Level (HL/SL) chips — only when the active subject has ≥2 levels */
  levelOptions?: LevelFacet[]
}

function Chip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`ec-chip-ms ec-chip-ms--outline${active ? ' on' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      {typeof count === 'number' && (
        <span className="ms-board-subjects__count"> {count}</span>
      )}
    </Link>
  )
}

/**
 * Board + subject + level filter shared by the blog index and the facet pages.
 * Pure links (server component) so facets are crawlable and shareable — no
 * client JS, which keeps content pages within the bundle budget.
 */
export function BoardSubjectFilter({
  activeBoard,
  activeSubject,
  activeLevel = null,
  subjectOptions = [],
  coreOptions = [],
  levelOptions = [],
}: Props) {
  return (
    <div className="ms-board-filter" aria-label="Filter by board and subject">
      <nav className="ms-hub-tabs" aria-label="Exam board">
        <Link
          href="/blog"
          className={`ms-hub-tab${activeBoard === null ? ' on' : ''}`}
          aria-current={activeBoard === null ? 'page' : undefined}
        >
          All boards
        </Link>
        {BOARDS.map((b) => (
          <Link
            key={b}
            href={`/blog/browse/${b}`}
            className={`ms-hub-tab${activeBoard === b ? ' on' : ''}`}
            aria-current={activeBoard === b ? 'page' : undefined}
          >
            {BOARD_LABELS[b]}
          </Link>
        ))}
      </nav>

      {activeBoard && subjectOptions.length > 0 && (
        <nav className="ms-board-subjects" aria-label={`${BOARD_LABELS[activeBoard]} subjects`}>
          <Chip
            href={`/blog/browse/${activeBoard}`}
            label={`All ${BOARD_LABELS[activeBoard]}`}
            active={activeSubject === null}
          />
          {subjectOptions.map((opt) => (
            <Chip
              key={opt.value}
              href={opt.href}
              label={opt.label}
              count={opt.count}
              active={activeSubject === opt.value}
            />
          ))}
        </nav>
      )}

      {activeBoard && coreOptions.length > 0 && (
        <nav className="ms-board-subjects" aria-label="IB Core">
          <span className="ms-board-group-label">IB Core</span>
          {coreOptions.map((opt) => (
            <Chip
              key={opt.value}
              href={opt.href}
              label={opt.label}
              count={opt.count}
              active={activeSubject === opt.value}
            />
          ))}
        </nav>
      )}

      {activeBoard && activeSubject && levelOptions.length > 0 && (
        <nav className="ms-board-subjects" aria-label="Level">
          <span className="ms-board-group-label">Level</span>
          <Chip
            href={`/blog/browse/${activeBoard}/${activeSubject}`}
            label="All levels"
            active={activeLevel === null}
          />
          {levelOptions.map((opt) => (
            <Chip
              key={opt.value}
              href={opt.href}
              label={opt.label}
              count={opt.count}
              active={activeLevel === opt.value}
            />
          ))}
        </nav>
      )}
    </div>
  )
}
