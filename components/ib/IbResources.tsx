import type { IbResource } from '@/lib/ib/resources'

/** Renders a "Free IB resources" block linking out to legitimate free sites. */
export function IbResources({
  resources,
  heading = 'Best free IB resources',
}: {
  resources: IbResource[]
  heading?: string
}) {
  if (!resources.length) return null
  return (
    <section aria-labelledby="ib-resources" style={{ marginTop: 40 }}>
      <h2 id="ib-resources" className="ms-h3" style={{ marginBottom: 6 }}>
        {heading}
      </h2>
      <p className="ms-body-2" style={{ marginBottom: 16, color: 'var(--ec-text-secondary)' }}>
        Hand-picked, fully legal and free — official IB papers plus the best teacher-made notes and solutions.
      </p>
      <ul className="ms-pp-grid">
        {resources.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-pp-card"
              style={{ alignItems: 'flex-start' }}
            >
              <span className="min-w-0 flex-1">
                <span className="ms-pp-title">{r.label}</span>
                <span className="ms-pp-meta" style={{ whiteSpace: 'normal' }}>
                  {r.note}
                </span>
              </span>
              <span className="ms-pp-cta" aria-hidden>
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
