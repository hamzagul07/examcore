import type { LucideIcon } from 'lucide-react'
import {
  EmptyStateIllustration,
  type IllustrationVariant,
} from '@/components/ui/EmptyStateIllustration'

type Props = {
  icon: LucideIcon
  title: string
  body: string
  /** When set, the component renders inline (no card) so the parent card's frame shows through. */
  inline?: boolean
  /** Replace the lucide icon with one of the brand illustrations. */
  illustration?: IllustrationVariant
}

/**
 * Section-level empty state. Used inside each progress card when the user has
 * no data for that view yet. Keeps copy/iconography consistent across sections
 * so empty days feel intentional rather than broken.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  inline,
  illustration,
}: Props) {
  const visual = illustration ? (
    <EmptyStateIllustration variant={illustration} size={inline ? 96 : 140} />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
      <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
    </div>
  )

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        {visual}
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        {visual}
        <div className="max-w-md">
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  )
}
