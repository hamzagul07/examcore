'use client'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function CourseExplainSimplerToggle({ checked, onChange, disabled }: Props) {
  return (
    <label className="ms-simpler">
      <span className="ms-micro">EXPLAIN SIMPLER</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`ms-simpler-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden />
      </button>
    </label>
  )
}
