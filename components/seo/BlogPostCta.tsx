import Link from 'next/link'
import { buildSignUpHref, MARKETING_SIGNUP_DEST } from '@/lib/auth-redirect'

/** End-of-article conversion block — internal link to product. */
export function BlogPostCta() {
  return (
    <aside className="ec-panel-highlight mt-12 rounded-2xl p-6 sm:p-8">
      <p className="ec-label-tech mb-2">TRY MARKSCHEME</p>
      <h2 className="landing-h3 text-[var(--ec-text-primary)]">
        Mark your next past paper mark-by-mark
      </h2>
      <p className="mt-3 text-base leading-relaxed text-[var(--ec-text-secondary)]">
        Upload a photo of your handwritten answer — or a whole paper — and get
        feedback tied to the real Cambridge mark scheme. Free tier available.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px] justify-center">
          Mark a paper free
        </Link>
        <Link
          href={buildSignUpHref(MARKETING_SIGNUP_DEST)}
          className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
        >
          Create free account
        </Link>
      </div>
    </aside>
  )
}
