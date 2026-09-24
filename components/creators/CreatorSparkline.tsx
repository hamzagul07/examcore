import type { DailyCount } from '@/lib/creators/service'

/**
 * Answers marked per day, last 30 days. One series, so: no legend, a 2px line
 * on the brand hue, the last point marked, the peak labelled, everything else
 * recessive. Text wears text tokens, never the series colour. Each day has a
 * hit area with a native tooltip, and the numbers are also in a table for
 * anyone who wants them as numbers.
 */
export function CreatorSparkline({ data, handle }: { data: DailyCount[]; handle: string }) {
  const W = 640
  const H = 140
  const padX = 8
  const padTop = 22
  const padBottom = 24
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)
  const n = data.length
  const x = (i: number) => padX + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const y = (v: number) => padTop + innerH - (v / max) * innerH
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.count).toFixed(1)}`)
  const line = points.join(' ')
  const area = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(n - 1).toFixed(1)},${y(0).toFixed(1)}`
  const peakIndex = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0)
  const last = data[n - 1]
  const fmt = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })

  return (
    <div className="ms-cr-spark">
      <div className="ms-cr-spark__head">
        <div>
          <span className="ms-cr-spark__num">{total.toLocaleString('en-GB')}</span>
          <span className="ms-cr-spark__label">answers marked in the last {n} days</span>
        </div>
        <span className="ms-cr-section__note">
          {fmt(data[0].day)} – {fmt(last.day)}
        </span>
      </div>
      <svg
        className="ms-cr-spark__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Answers marked with @${handle} per day over the last ${n} days, ${total} in total`}
      >
        {/* Baseline and a single recessive guide at the peak. */}
        <line
          x1={padX}
          x2={W - padX}
          y1={y(0)}
          y2={y(0)}
          className="ms-cr-spark__baseline"
        />
        {total > 0 ? (
          <line
            x1={padX}
            x2={W - padX}
            y1={y(max)}
            y2={y(max)}
            className="ms-cr-spark__guide"
          />
        ) : null}
        <polygon points={area} className="ms-cr-spark__area" />
        <polyline points={line} className="ms-cr-spark__line" />
        {total > 0 ? (
          <>
            <circle
              cx={x(peakIndex)}
              cy={y(data[peakIndex].count)}
              r={4}
              className="ms-cr-spark__dot"
            />
            <text
              x={Math.min(Math.max(x(peakIndex), padX + 28), W - padX - 28)}
              y={y(data[peakIndex].count) - 8}
              textAnchor="middle"
              className="ms-cr-spark__value"
            >
              {data[peakIndex].count}
            </text>
          </>
        ) : null}
        <circle cx={x(n - 1)} cy={y(last.count)} r={4} className="ms-cr-spark__dot ms-cr-spark__dot--last" />
        <text x={padX} y={H - 6} className="ms-cr-spark__axis">
          {fmt(data[0].day)}
        </text>
        <text x={W - padX} y={H - 6} textAnchor="end" className="ms-cr-spark__axis">
          {fmt(last.day)}
        </text>
        {/* Hit areas: one per day, native tooltip. */}
        {data.map((d, i) => {
          const left = i === 0 ? padX : (x(i - 1) + x(i)) / 2
          const right = i === n - 1 ? W - padX : (x(i) + x(i + 1)) / 2
          return (
            <rect
              key={d.day}
              x={left}
              y={padTop - 10}
              width={Math.max(1, right - left)}
              height={innerH + 10}
              className="ms-cr-spark__hit"
            >
              <title>{`${fmt(d.day)} · ${d.count} ${d.count === 1 ? 'answer' : 'answers'}`}</title>
            </rect>
          )
        })}
      </svg>
      <details className="ms-cr-spark__table">
        <summary>As a table</summary>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th className="is-num">Answers</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((d) => d.count > 0)
              .map((d) => (
                <tr key={d.day}>
                  <td>{fmt(d.day)}</td>
                  <td className="is-num">{d.count}</td>
                </tr>
              ))}
            {total === 0 ? (
              <tr>
                <td colSpan={2}>No answers in this window yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </details>
    </div>
  )
}
