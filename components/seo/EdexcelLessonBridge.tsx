import Link from 'next/link'

type Props = {
  unitCode: string
  markHref: string
  unitHubHref: string
  nextLesson?: { href: string; title: string; topicCode: string } | null
}

/**
 * Shown atop a CAIE course lesson when opened from an Edexcel study path.
 * Keeps board identity + pushes visual learn → Edexcel mark.
 */
export function EdexcelLessonBridge({
  unitCode,
  markHref,
  unitHubHref,
  nextLesson,
}: Props) {
  return (
    <aside
      className="mx-auto mb-4 max-w-[var(--ec-content-max,960px)] px-4 sm:px-6"
      aria-label={`Edexcel ${unitCode} study path`}
    >
      <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border))] bg-[color-mix(in_srgb,var(--ec-brand)_8%,var(--ec-surface-raised))] px-4 py-4 sm:px-5">
        <p className="ms-overline mb-1">Edexcel IAL · {unitCode}</p>
        <p className="text-sm font-semibold text-[var(--ec-text-primary)] sm:text-base">
          Mapped visual lesson — play the diagram, then mark with Pearson method /
          accuracy marks for {unitCode}.
        </p>
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ec-text-secondary)] sm:text-sm">
          <li>
            <span className="font-semibold text-[var(--ec-text-primary)]">1.</span> Live
            diagram
          </li>
          <li>
            <span className="font-semibold text-[var(--ec-text-primary)]">2.</span> Mark{' '}
            {unitCode}
          </li>
          <li>
            <span className="font-semibold text-[var(--ec-text-primary)]">3.</span> Return
            here
          </li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="#visual"
            className="ec-btn-primary inline-flex min-h-[44px] items-center text-sm"
          >
            Open live diagram
          </a>
          <Link
            href={markHref}
            className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
          >
            Mark {unitCode} -&gt;
          </Link>
          <Link
            href={unitHubHref}
            className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
          >
            {unitCode} path
          </Link>
        </div>
        {nextLesson ? (
          <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
            Next on this path:{' '}
            <Link
              href={nextLesson.href}
              className="font-semibold text-[var(--ec-text-primary)] underline-offset-2 hover:underline"
            >
              {nextLesson.topicCode} {nextLesson.title}
            </Link>
          </p>
        ) : null}
      </div>
    </aside>
  )
}
