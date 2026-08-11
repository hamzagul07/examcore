import type { EffectiveAccess } from '@/lib/billing/access'

/**
 * Subscription badge beside an author's name.
 *
 * Tiers look different on purpose: a single "supporter" mark would flatten the
 * thing people actually pay more for. Max is the loudest, Scholar sits below
 * it, Pro is quietest — and free shows nothing at all, so the badge stays a
 * signal rather than decoration.
 */
const BADGES: Record<Exclude<EffectiveAccess, 'free'>, { label: string; title: string }> = {
  max: { label: 'Max', title: 'MarkScheme Max subscriber' },
  scholar: { label: 'Scholar', title: 'MarkScheme Scholar subscriber' },
  pro: { label: 'Pro', title: 'MarkScheme Pro subscriber' },
}

export function AuthorBadge({ access }: { access: EffectiveAccess | undefined }) {
  if (!access || access === 'free') return null
  const badge = BADGES[access]
  if (!badge) return null

  return (
    <span className={`rc-tier-badge rc-tier-badge--${access}`} title={badge.title}>
      <span className="rc-tier-badge__gem" aria-hidden>
        ◆
      </span>
      {badge.label}
    </span>
  )
}
