import { FirstMarkPreview } from '@/components/dashboard/FirstMarkPreview'
import { MomentumStrip } from '@/components/dashboard/MomentumStrip'
import { buildMomentum } from '@/lib/dashboard/momentum'

export const metadata = {
  title: 'New-user home — dev',
  robots: { index: false, follow: false },
}

/**
 * What a brand-new account actually sees. /dashboard is auth-gated, and this is
 * the state most accounts are in (82% have never marked), so it is the single
 * most important thing to be able to look at.
 */
export default function NewUserPreviewPage() {
  const empty = buildMomentum([], 14, new Date('2026-07-22T09:30:00Z'))
  return (
    <div className="mx-auto max-w-[860px] px-4 py-10">
      <h1 className="ms-h2 mb-2">New-user home</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        The empty-account state: momentum strip with nothing in it, and the
        first-mark preview that replaced three em-dash tiles.
      </p>

      <p className="ec-eyebrow mb-3">Momentum strip — empty fortnight</p>
      <MomentumStrip summary={empty} streak={0} />

      <p className="ec-eyebrow mb-3 mt-8">First-mark preview</p>
      <div className="ec-card p-5">
        <FirstMarkPreview />
      </div>
    </div>
  )
}
