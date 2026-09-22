'use client'

import Link from 'next/link'

/**
 * "A copy is in your inbox" — said on the result, where the student can see it.
 *
 * Every signed-in mark is emailed, but a promise made on the wait screen is
 * easy to miss and easy to doubt; naming the address on the result is what
 * makes it believable, and the settings link is the honest way out.
 */
export function MarkEmailedNote({ email }: { email: string }) {
  return (
    <p
      className="ms-mark-emailed-note mb-4 text-sm text-[var(--ec-text-secondary)]"
      role="status"
    >
      A copy of this score is on its way to{' '}
      <span className="font-medium text-[var(--ec-text-primary)]">{email}</span>.{' '}
      <Link
        href="/account/preferences"
        className="underline underline-offset-2 hover:text-[var(--ec-text-primary)]"
      >
        Email settings
      </Link>
    </p>
  )
}
