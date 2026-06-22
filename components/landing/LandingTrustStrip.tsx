const TRUST_ITEMS = [
  { value: 'Mark', label: 'B1 · M1 · A1 schemes' },
  { value: 'Learn', label: 'Free syllabus courses' },
  { value: 'Discuss', label: 'A-Level & IB rooms' },
  { value: '~60 sec', label: 'Photo to feedback' },
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
