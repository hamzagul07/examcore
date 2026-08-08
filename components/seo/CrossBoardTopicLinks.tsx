import Link from 'next/link'
import {
  listOverlapForSubject,
  resolveCaieLinksForEdexcelUnit,
  resolveEdexcelLinksForCaieTopic,
} from '@/lib/curriculum-graph'
import { edexcelMarkHref } from '@/lib/edexcel/marking'

type CrossBoardTopicLinksProps =
  | { mode: 'caie-topic'; syllabusCode: string; topicCode: string }
  | { mode: 'edexcel-unit'; unitCode: string }
  | { mode: 'edexcel-maths-hub' }

/**
 * Phase E3 surface — CAIE ↔ Edexcel IAL Maths overlap links.
 * Graph data only; does not fork lesson JSON.
 */
export function CrossBoardTopicLinks(props: CrossBoardTopicLinksProps) {
  if (props.mode === 'caie-topic') {
    if (props.syllabusCode !== '9709') return null
    const links = resolveEdexcelLinksForCaieTopic(props.syllabusCode, props.topicCode)
    if (!links.length) return null
    return (
      <aside
        className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
        aria-label="Related on Edexcel International"
      >
        <p className="ms-overline mb-2">Related on Edexcel IAL</p>
        <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
          Same idea family on Pearson International A Level — different paper rhythm and
          UMS cash-in. Practise the unit you sit.
        </p>
        <ul className="flex flex-wrap gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex rounded border border-[var(--ec-border)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
              >
                {l.syllabusOrUnit} · {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={edexcelMarkHref(links[0]?.syllabusOrUnit)}
          className="ec-btn-ghost ec-btn-ghost--sm mt-3 inline-flex"
        >
          Mark on Edexcel board
        </Link>
      </aside>
    )
  }

  if (props.mode === 'edexcel-unit') {
    const links = resolveCaieLinksForEdexcelUnit(props.unitCode).slice(0, 8)
    if (!links.length) return null
    return (
      <aside
        className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
        aria-label="Related on Cambridge"
      >
        <p className="ms-overline mb-2">Related on Cambridge 9709</p>
        <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
          Overlapping Pure / Mechanics / Statistics ideas — mark with Cambridge dialect
          only if you sit 9709.
        </p>
        <ul className="flex flex-wrap gap-2">
          {links.map((l) => (
            <li key={`${l.topicCode}-${l.href}`}>
              <Link
                href={l.href}
                className="inline-flex rounded border border-[var(--ec-border)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
              >
                {l.topicCode} · {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/caie/a-level/mathematics/9709" className="ec-btn-underline mt-3 inline-flex">
          Cambridge 9709 hub
        </Link>
      </aside>
    )
  }

  const overlap = listOverlapForSubject('9709')
  if (!overlap.length) return null
  return (
    <aside
      className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
      aria-label="Cambridge overlap map"
    >
      <p className="ms-overline mb-2">Cambridge 9709 overlap</p>
      <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
        Topic-level map from Cambridge Mathematics into IAL units (content graph — not a
        grade converter).
      </p>
      <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
        {overlap.map((o) => (
          <li key={o.unitCode}>
            <Link
              href={`/edexcel/international-a-level/mathematics/${o.unitCode.toLowerCase()}`}
              className="ec-card block p-3 text-sm"
            >
              <span className="font-semibold">
                {o.unitCode} · {o.label}
              </span>
              <span className="ms-micro mt-1 block">{o.topicCount} mapped 9709 topics</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/caie/a-level/mathematics/9709" className="ec-btn-underline mt-3 inline-flex">
        Open Cambridge 9709
      </Link>
    </aside>
  )
}
