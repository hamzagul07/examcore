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
            ? `Focusing on ${active.name} — weakest or selected.`
            : 'Pick a subject shelf to open its curated pack and drills.'}
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
          <p className="ms-overline m-0 mb-2 text-[var(--ec-c-math)]">Curated Max pack</p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">{shelf.curated.blurb}</p>
          <ul className="ms-vault__digest">
            {shelf.curated.examinerDigest.slice(0, 4).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <ul className="mt-3 m-0 list-none space-y-2 pl-0">
            {[
              ...shelf.curated.paperPath,
              ...shelf.curated.courseLinks,
              ...shelf.curated.techniqueLinks,
            ]
              .slice(0, 6)
              .map((l) => (
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

      {shelf.technique ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-teal)]">
            {shelf.technique.title}
          </p>
          <ul className="m-0 list-none space-y-2 pl-0">
            {shelf.technique.links.map((l) => (
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

      {shelf.drills.length > 0 ? (
        <div>
          <p className="ms-overline m-0 mb-2 text-[var(--ec-brand)]">Weak-topic drills</p>
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

      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 pl-0">
        {shelf.links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="ec-link text-sm font-semibold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
