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
    <section className="ec-card ec-card--paper mb-6 space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          SB
        </span>
        <h2 className="text-lg font-bold text-[var(--ec-text-primary)] m-0">
          Resources by your subjects
        </h2>
      </div>
      <p className="text-body m-0 text-[var(--ec-text-secondary)]">
        Built from your profile subjects
        {active?.isFocus
          ? ` — focusing on ${active.name} (weakest or selected).`
          : '.'}
      </p>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Your subjects"
      >
        {shelves.map((s) => {
          const selected = s.code === active?.code
          return (
            <button
              key={s.code}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded border px-3 py-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-[var(--ec-brand)] bg-[var(--ec-brand-muted,transparent)] text-[var(--ec-brand)]'
                  : 'border-[var(--ec-border)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]'
              }`}
              onClick={() => {
                router.push(`/dashboard/vault?subject=${encodeURIComponent(s.code)}`)
              }}
            >
              {s.name}
              {s.avgPct !== null ? (
                <span className="ml-1 font-mono text-[11px] opacity-80">
                  {Math.round(s.avgPct)}%
                </span>
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
                <li key={s.code} className="flex flex-wrap items-baseline justify-between gap-2">
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
                    href={s.links[0]?.href ?? `/past-papers/${s.code}`}
                    className="font-mono text-[11px] font-bold uppercase tracking-wide text-[var(--ec-brand)]"
                  >
                    Open →
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function SubjectShelfDetail({ shelf }: { shelf: MaxSubjectShelf }) {
  return (
    <div className="space-y-4 rounded border border-[var(--ec-border)] p-3 sm:p-4">
      <div>
        <p className="ms-overline m-0 mb-1">
          {shelf.code}
          {shelf.isFocus ? ' · focus' : ''}
        </p>
        <h3 className="text-base font-bold text-[var(--ec-text-primary)] m-0">
          {shelf.name}
        </h3>
        <p className="text-sm m-0 mt-1 text-[var(--ec-text-secondary)]">
          {shelf.attemptCount} marked
          {shelf.avgPct !== null ? ` · ${Math.round(shelf.avgPct)}% recent form` : ''}
        </p>
      </div>

      {shelf.curated ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--ec-text-primary)] m-0 mb-1">
            Curated Max pack
          </p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">{shelf.curated.blurb}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--ec-text-secondary)]">
            {shelf.curated.examinerDigest.slice(0, 2).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {shelf.drills.length > 0 ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--ec-text-primary)] m-0 mb-1">
            Weak-topic drills
          </p>
          <ul className="m-0 list-none space-y-1 pl-0">
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

      {shelf.technique ? (
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--ec-text-primary)] m-0 mb-1">
            Technique
          </p>
          <ul className="m-0 list-none space-y-1 pl-0">
            {shelf.technique.links.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="ec-link font-semibold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--ec-text-primary)] m-0 mb-1">
          Quick links
        </p>
        <ul className="m-0 list-none space-y-1 pl-0">
          {shelf.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="ec-link font-semibold">
                {l.label}
              </Link>
            </li>
          ))}
          {shelf.ibLinks.slice(0, 3).map((l) => (
            <li key={l.href}>
              <a href={l.href} className="ec-link font-semibold" rel="noopener noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
