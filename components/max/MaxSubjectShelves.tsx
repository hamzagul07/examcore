'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MaxSubjectShelf } from '@/lib/max/vault-data'
import { drillHref } from '@/lib/insights/drill-link'

/** Tabs across every subject on the student's profile. */
export function MaxSubjectShelves({
  shelves,
  focusCode,
}: {
  shelves: MaxSubjectShelf[]
  focusCode: string | null
}) {
  const router = useRouter()
  if (shelves.length === 0) return null

  const active = shelves.find((s) => s.code === focusCode) ?? shelves[0]

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          SB
        </span>
        <p className="ec-eyebrow mb-0">By subject</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your subject shelves
        </h2>
      </div>

      <div className="ms-vault__panel ms-vault__panel--blue space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          {active?.isFocus
            ? `Focusing on ${active.name} — drills and courses first, blogs last.`
            : 'Pick a subject shelf for MarkScheme drills and course paths.'}
        </p>

        <div className="ms-vault__tabs" role="tablist" aria-label="Your subjects">
          {shelves.map((s) => {
            const selected = s.code === active?.code
            return (
              <button
                key={s.code}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`ms-vault__tab${selected ? ' is-active' : ''}`}
                onClick={() => {
                  router.push(`/dashboard/vault?subject=${encodeURIComponent(s.code)}`)
                }}
              >
                {s.name}
                {s.avgPct !== null ? (
                  <span className="ml-1 opacity-80">{Math.round(s.avgPct)}%</span>
                ) : null}
              </button>
            )
          })}
        </div>

        {active ? <SubjectShelfDetail shelf={active} /> : null}

        {shelves.length > 1 ? (
          <div className="border-t border-[var(--ec-border)] pt-4">
            <p className="ms-overline m-0 mb-2">Your other subjects</p>
            <ul className="m-0 list-none space-y-3 pl-0">
              {shelves
                .filter((s) => s.code !== active?.code)
                .map((s) => (
                  <li
                    key={s.code}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <div>
                      <button
                        type="button"
                        className="ec-link font-semibold"
                        onClick={() =>
                          router.push(
                            `/dashboard/vault?subject=${encodeURIComponent(s.code)}`
                          )
                        }
                      >
                        {s.name}
                      </button>
                      <span className="text-[var(--ec-text-secondary)]">
                        {' '}
                        · {s.attemptCount} marked
                        {s.avgPct !== null ? ` · ${Math.round(s.avgPct)}%` : ''}
                        {s.curated ? ' · curated Max pack' : ''}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/vault?subject=${encodeURIComponent(s.code)}`}
                      className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
                    >
                      Open -&gt;
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function SubjectShelfDetail({ shelf }: { shelf: MaxSubjectShelf }) {
  const courseFirst = [
    ...(shelf.curated?.courseLinks ?? []),
    ...shelf.links.filter((l) => l.href.includes('/courses/')),
  ]
  const paperLinks = [
    ...(shelf.curated?.paperPath ?? []).filter((l) => !l.href.includes('/past-papers/ib-')),
    ...shelf.links.filter(
      (l) =>
        l.href.includes('/past-papers/') ||
        l.href.includes('/ib/past-papers/') ||
        l.href.startsWith('https://www.ibo.org') ||
        l.href.startsWith('https://www.revisiondojo.com') ||
        l.href.startsWith('https://www.revisionvillage.com') ||
        l.href.startsWith('https://www.christosnikolaidis.com') ||
        l.href.startsWith('https://www.ibresources.cc')
    ),
  ]
  // Deduplicate by href
  const seenPaper = new Set<string>()
  const uniquePaperLinks = paperLinks.filter((l) => {
    if (seenPaper.has(l.href)) return false
    seenPaper.add(l.href)
    return true
  })
  // Technique / blog links stay secondary — Max value is in drills + courses.
  const techniqueLinks = [
    ...(shelf.curated?.techniqueLinks ?? []),
    ...(shelf.technique?.links ?? []),
  ].filter((l) => !l.href.startsWith('http'))

  const isIb = shelf.code.startsWith('ib-')
  // IB also gets licensed sources from shelf.ibLinks
  const licensedIb = isIb
    ? shelf.ibLinks.filter((l) => l.href.startsWith('http')).slice(0, 4)
    : []

  return (
    <div className="space-y-4 border-t border-[var(--ec-border)] pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
          {shelf.name}
          {shelf.isFocus ? (
            <span className="ml-2 text-[var(--ec-brand)]">· focus</span>
          ) : null}
        </h3>
        <span className="font-mono text-xs text-[var(--ec-acc-blue)]">
          {shelf.attemptCount} marked
          {shelf.avgPct !== null ? ` · ${Math.round(shelf.avgPct)}% avg` : ''}
        </span>
      </div>

      {shelf.curated ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-c-math)]">Examiner digest</p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">{shelf.curated.blurb}</p>
          <ul className="ms-vault__digest">
            {shelf.curated.examinerDigest.slice(0, 4).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {shelf.drills.length > 0 ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-brand)]">
            Weak-topic drills (mark these)
          </p>
          <ul className="m-0 list-none space-y-2 pl-0">
            {shelf.drills.map((d) => (
              <li key={`${d.paperCode}-${d.questionNumber}`}>
                <Link href={drillHref(d)} className="ec-link font-semibold">
                  {d.paperCode} Q{d.questionNumber}
                </Link>
                <span className="text-[var(--ec-text-secondary)]"> — {d.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {courseFirst.length > 0 ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-blue)]">Course path</p>
          <ul className="m-0 list-none space-y-2 pl-0">
            {courseFirst.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="ec-link font-semibold">
                  {l.label}
                </Link>
                {l.note ? (
                  <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {uniquePaperLinks.length > 0 || licensedIb.length > 0 ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-rose)]">
            {isIb ? 'Licensed papers + practice desk' : 'Timed papers on MarkScheme'}
          </p>
          <ul className="m-0 list-none space-y-2 pl-0">
            {[...licensedIb, ...uniquePaperLinks].slice(0, 5).map((l) => {
              const external = l.href.startsWith('http')
              return (
                <li key={l.href}>
                  {external ? (
                    <a
                      href={l.href}
                      className="ec-link font-semibold"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link href={l.href} className="ec-link font-semibold">
                      {l.label}
                    </Link>
                  )}
                  {l.note ? (
                    <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {techniqueLinks.length > 0 ? (
        <details>
          <summary className="ms-vault__extras-summary text-sm">Technique notes</summary>
          <ul className="mt-2 m-0 list-none space-y-2 pl-0">
            {techniqueLinks.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="ec-link font-semibold">
                  {l.label}
                </Link>
                {'note' in l && l.note ? (
                  <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
