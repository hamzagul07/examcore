const TRUST_ITEMS = [
  { value: '15', label: 'Cambridge syllabuses' },
  { value: 'B1 · M1 · A1', label: 'Real marking codes' },
  { value: '~60 sec', label: 'Photo to feedback' },
  { value: '100% free', label: 'Premium courses' },
] as const

export function LandingTrustStrip() {
  return (
    <section className="ms-pg">
      <div className="ms-trust">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label}>
            <b>{item.value}</b>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
