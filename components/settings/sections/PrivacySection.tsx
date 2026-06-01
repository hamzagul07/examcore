import Link from 'next/link'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'

export function PrivacySection() {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Your data"
        description="Export and privacy controls."
      >
        <div
          className="rounded-2xl border px-4 py-4"
          style={{
            borderColor: 'var(--ec-border)',
            background: 'var(--ec-surface-raised)',
          }}
        >
          <p className="text-body-large font-semibold text-[var(--ec-text-primary)]">
            Download my data
          </p>
          <p className="text-caption mt-1">Planned feature</p>
          <p className="text-body mt-3">
            You&apos;ll be able to export your attempts, marks, and profile data.
            For now, email{' '}
            <a
              href="mailto:hello@examcore.ai"
              className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
            >
              hello@examcore.ai
            </a>{' '}
            to request a copy.
          </p>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Delete account">
        <p className="text-body">
          Account deletion from settings is coming soon. To remove your account and
          uploads now, contact{' '}
          <a
            href="mailto:hello@examcore.ai"
            className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
          >
            hello@examcore.ai
          </a>
          .
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard title="Legal">
        <ul className="space-y-2 text-body">
          <li>
            <Link
              href="/privacy"
              className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
            >
              Privacy policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
            >
              Terms of service
            </Link>
          </li>
        </ul>
      </SettingsSectionCard>
    </div>
  )
}
