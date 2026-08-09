import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-[60vh] items-center justify-center px-4">
      <div className="ec-card ec-card--paper relative mx-auto w-full max-w-lg overflow-hidden border border-[var(--ec-border)] p-8 text-center shadow-[var(--ec-shadow-hard,6px_6px_0_rgba(0,0,0,0.1))] sm:p-12">
        <span
          className="mx-auto mb-4 inline-grid h-8 min-w-8 place-items-center rounded border border-[var(--ec-ink-crimson,#bb2a25)] bg-[color-mix(in_srgb,var(--ec-ink-crimson,#bb2a25)_10%,transparent)] px-2 font-mono text-xs font-bold tracking-wide text-[var(--ec-ink-crimson,#bb2a25)]"
          aria-hidden
        >
          A0
        </span>
        <p
          className="relative mb-2 font-mono text-[64px] font-bold leading-none tracking-tight text-[var(--ec-brand)]"
          aria-hidden
        >
          404
        </p>
        <h1 className="text-headline relative mb-3">Page not found</h1>
        <p className="text-body mb-8">
          That link may be broken, or the page may have moved. Try one of these
          instead — or search the site with{' '}
          <kbd className="rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-1.5 py-0.5 font-mono text-xs font-semibold shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]">
            Ctrl
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-1.5 py-0.5 font-mono text-xs font-semibold shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]">
            K
          </kbd>
          .
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <LoadingLink
            href="/"
            loadingText="Opening…"
            className="ec-btn-primary justify-center px-7 py-3.5"
          >
            Go home
          </LoadingLink>
          <LoadingLink
            href="/mark"
            loadingText="Opening…"
            className="ec-btn-secondary justify-center px-7 py-3.5"
          >
            Mark a question
          </LoadingLink>
          <LoadingLink
            href="/subjects"
            loadingText="Opening…"
            className="ec-btn-ghost justify-center px-7 py-3.5"
          >
            Browse subjects
          </LoadingLink>
        </div>
        <p className="ec-not-found-hint">
          <Link href="/faq" className="ec-link">
            FAQ
          </Link>
          {' · '}
          <Link href="/guides" className="ec-link">
            Guides
          </Link>
        </p>
      </div>
    </main>
  )
}
