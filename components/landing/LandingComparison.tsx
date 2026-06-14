const ROWS: { label: string; ms: string; chat: string; tutor: string }[] = [
  {
    label: 'Uses the official scheme for your exact paper',
    ms: 'y:✓ always',
    chat: 'n:✗ guesses',
    tutor: 'mid:~ sometimes',
  },
  {
    label: 'Mark-by-mark B1/M1/A1 with citations',
    ms: 'y:✓',
    chat: 'n:✗',
    tutor: 'y:✓',
  },
  {
    label: 'Feedback written on your actual script',
    ms: "y:✓ Examiner's Ink",
    chat: 'n:✗ wall of text',
    tutor: 'y:✓',
  },
  {
    label: 'Available at 1am before the mock',
    ms: 'y:✓ ~60 sec',
    chat: 'y:✓',
    tutor: 'n:✗',
  },
  {
    label: 'Tracks error patterns across attempts',
    ms: 'y:✓',
    chat: 'n:✗',
    tutor: 'mid:~ in their head',
  },
  {
    label: 'Cost per marked paper',
    ms: 'y:from free',
    chat: 'y:free-ish',
    tutor: 'n:£30–60/hr',
  },
]

function parseCell(raw: string, us = false) {
  const [kind, ...rest] = raw.split(':')
  const text = rest.join(':')
  const cls =
    kind === 'y' ? 'ms-cmp-cell--y' : kind === 'n' ? 'ms-cmp-cell--n' : 'ms-cmp-cell--mid'
  return (
    <div className={`ms-cmp-cell ${cls}${us ? ' ms-us-col' : ''}`}>{text}</div>
  )
}

export function LandingComparison() {
  return (
    <section className="ms-pg ms-sec">
      <p className="ms-overline">Why not just ask a chatbot?</p>
      <h2 className="ms-h2">
        Generic AI guesses. <em>This one cites.</em>
      </h2>
      <div className="ms-cmp-scroll">
        <div className="ms-cmp">
        <div className="ms-cmp-row ms-cmp-head">
          <div />
          <div className="ms-us-head">MarkScheme</div>
          <div style={{ textAlign: 'center' }}>Generic AI chat</div>
          <div style={{ textAlign: 'center' }}>Private tutor</div>
        </div>
        {ROWS.map((row) => (
          <div key={row.label} className="ms-cmp-row">
            <div className="ms-lab">{row.label}</div>
            {parseCell(row.ms, true)}
            {parseCell(row.chat)}
            {parseCell(row.tutor)}
          </div>
        ))}
        </div>
      </div>
      <p className="ms-micro" style={{ marginTop: 18 }}>
        HONEST FOOTNOTE: A GOOD TUTOR ALSO TEACHES — WE JUST MARK LIKE ONE, AT 1AM, FOR FREE
      </p>
    </section>
  )
}
