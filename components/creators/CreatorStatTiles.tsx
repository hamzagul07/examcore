export type CreatorStatItem = {
  num: number
  label: string
  sub?: string
  accent?: boolean
}

export function CreatorStatTiles({
  items,
  five = false,
}: {
  items: CreatorStatItem[]
  five?: boolean
}) {
  return (
    <dl className={`ms-cr-stats${five ? ' ms-cr-stats--five' : ''}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`ms-cr-stat${item.accent ? ' ms-cr-stat--accent' : ''}`}
        >
          <dd className="ms-cr-stat__num">{item.num.toLocaleString('en-GB')}</dd>
          <dt className="ms-cr-stat__label">{item.label}</dt>
          {item.sub ? <p className="ms-cr-stat__sub">{item.sub}</p> : null}
        </div>
      ))}
    </dl>
  )
}
