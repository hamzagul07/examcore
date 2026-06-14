'use client'

import { Card } from '@/components/ui/Card'

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
    <Card variant="glass" padding="lg" as="section" className="ms-settings-section">
      <div className="mb-6">
        <h2 className="text-h3 text-[var(--ec-text-primary)]">{title}</h2>
        {description && <p className="text-body mt-1">{description}</p>}
      </div>
      {children}
    </Card>
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
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <p className="label-overline mb-2">{label}</p>
      {children}
      {hint && <p className="text-caption mt-2">{hint}</p>}
    </div>
  )
}

export function SettingsStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: 'var(--ec-border)',
        background: 'var(--ec-surface-raised)',
      }}
    >
      <p className="label-overline mb-1">{label}</p>
      <p className="text-body-large font-semibold text-[var(--ec-text-primary)]">{value}</p>
    </div>
  )
}
