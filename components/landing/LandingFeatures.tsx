import { Chip } from '@/components/margin-notes'

const FEATURES = [
  {
    wide: true,
    glyph: 'MS',
    title: 'Official mark schemes',
    body: 'Each question pulls criteria from the real Cambridge paper — method marks, accuracy marks, MCQ keys and essay bands, cited line by line.',
    chips: [
      { variant: 'ok' as const, label: 'B1 · M1 · A1' },
      { variant: 'dim' as const, label: 'MCQ keys' },
      { variant: 'warn' as const, label: 'Essay bands' },
    ],
  },
  {
    glyph: '✎',
    title: "Examiner's Ink",
    body: 'Stamps and notes overlaid on your working — see which line earned or lost each mark.',
  },
  {
    glyph: 'Q·P',
    title: 'One question or whole paper',
    body: 'Quick check on a single part, or the full script with a projected grade.',
  },
  {
    glyph: 'IMG',
    title: 'Photos, camera, PDF',
    body: 'Multi-page uploads with reorder — assign pages to questions on whole papers.',
  },
  {
    glyph: 'A*',
    title: 'Grade boundaries',
    body: 'Rough A*–E estimates from real boundary patterns — honest approximations, not a crystal ball.',
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="ms-pg ms-sec scroll-mt-20 ec-section-tint ec-section-tint--learn">
      <p className="ms-overline">What you get</p>
      <h2 className="ms-h2">
        Real schemes. <em>Real standards.</em>
      </h2>
      <p className="ms-lead">
        Not a chatbot&apos;s opinion — feedback tied to the actual mark scheme for that paper and
        question.
      </p>
      <div className="ms-feat-grid">
        {FEATURES.map((feat) => (
          <div
            key={feat.title}
            className={`ec-card ms-feat ${feat.wide ? 'ms-feat--wide' : ''}`}
          >
            <span className="ms-glyph">{feat.glyph}</span>
            <h3 className="ms-h3">{feat.title}</h3>
            <p className="ms-body-2">{feat.body}</p>
            {feat.chips ? (
              <div className="ms-feat-chips">
                {feat.chips.map((c) => (
                  <Chip key={c.label} variant={c.variant}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
