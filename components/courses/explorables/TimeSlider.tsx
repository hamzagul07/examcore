'use client'

/** Time scrubber with a play/pause toggle, shared by animated explorables. */
export function TimeSlider({
  value,
  playing,
  onScrub,
  onToggle,
  label = 'time',
}: {
  value: number
  playing: boolean
  onScrub: (v: number) => void
  onToggle: () => void
  label?: string
}) {
  return (
    <label className="qex-slider qex-time">
      <span className="qex-slider-head">
        <span className="qex-time-head">
          <button
            type="button"
            className="qex-playbtn"
            onClick={onToggle}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing ? '❙❙' : '▶'}
          </button>
          <span className="qex-slider-label mono">{label}</span>
        </span>
        <span className="qex-slider-val mono">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.005}
        value={value}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  )
}
