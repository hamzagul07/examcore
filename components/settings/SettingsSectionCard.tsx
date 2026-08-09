import { PaperCard } from '@/components/ui/PaperCard'

export function SettingsSectionCard({
  children,
  title,
  description,
}: {
  children: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <PaperCard variant="paper" padding="lg" as="section" className="ms-settings-section">
      <div className="mb-6">
        <h2 className="text-h3 text-[var(--ec-text-primary)]">{title}</h2>
        {description && <p className="text-body mt-1">{description}</p>}
      </div>
      {children}
    </PaperCard>
  )
}

export function SettingsSubsection({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="text-h3 mb-4 text-[var(--ec-text-primary)]">{title}</h3>
      {children}
    </div>
  )
}

export function SettingsFieldGroup({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  /** When set, renders a real <label htmlFor>. Omit for composite groups (fieldset/legend). */
  htmlFor?: string
}) {
  const hintId = hint
    ? `${htmlFor ?? label.replace(/\s+/g, '-').toLowerCase()}-hint`
    : undefined

  if (htmlFor) {
    return (
      <div>
        <label htmlFor={htmlFor} className="label-overline mb-2 block">
          {label}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-caption mt-2">
            {hint}
          </p>
        )}
      </div>
    )
  }

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="label-overline mb-2 px-0">{label}</legend>
      {children}
      {hint && (
        <p id={hintId} className="text-caption mt-2">
          {hint}
        </p>
      )}
    </fieldset>
  )
}

export function SettingsStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="ec-card ec-card--paper px-4 py-3"
      style={{
        borderColor: 'var(--ec-border)',
      }}
    >
      <p className="label-overline mb-1">{label}</p>
      <p className="text-body-large font-semibold text-[var(--ec-text-primary)]">{value}</p>
    </div>
  )
}
