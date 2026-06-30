import Link from 'next/link'
import { BOARD_LABELS, BOARDS, type Board } from '@/lib/content/taxonomy'

export type SubjectFacet = { value: string; label: string; href: string; count: number }

type Props = {
  /** null = the "All" board view (the /blog index) */
  activeBoard: Board | null
  /** null = the board's "all subjects" view */
  activeSubject: string | null
  /** Subjects available for the active board (server-computed from content) */
  subjectOptions?: SubjectFacet[]
}

/**
 * Board + subject filter shared by the blog index and the browse facet pages.
 * Pure links (server component) so facets are crawlable and shareable — no
 * client JS, which keeps content pages within the bundle budget.
 */
export function BoardSubjectFilter({
  activeBoard,
  activeSubject,
  subjectOptions = [],
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
          <Link
            href={`/blog/browse/${activeBoard}`}
            className={`ec-chip-ms ec-chip-ms--outline${activeSubject === null ? ' on' : ''}`}
            aria-current={activeSubject === null ? 'page' : undefined}
          >
            All {BOARD_LABELS[activeBoard]}
          </Link>
          {subjectOptions.map((opt) => (
            <Link
              key={opt.value}
              href={opt.href}
              className={`ec-chip-ms ec-chip-ms--outline${activeSubject === opt.value ? ' on' : ''}`}
              aria-current={activeSubject === opt.value ? 'page' : undefined}
            >
              {opt.label} <span className="ms-board-subjects__count">{opt.count}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
