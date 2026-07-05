import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-[60vh] items-center justify-center px-4">
      <div className="ec-card relative mx-auto w-full max-w-lg overflow-hidden p-8 text-center sm:p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full ec-glow-orb blur-[80px] opacity-60"
          aria-hidden
        />
        <p
          className="relative mb-2 font-mono text-[64px] font-bold leading-none tracking-tight"
          style={{
            background:
              'linear-gradient(180deg, var(--ec-brand), color-mix(in srgb, var(--ec-brand) 35%, transparent))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
          aria-hidden
        >
          404
        </p>
        <h1 className="text-headline relative mb-3">Page not found</h1>
        <p className="text-body mb-8">
          That link may be broken, or the page may have moved. Try one of these
          instead — or search the site with{' '}
          <kbd className="rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-1.5 py-0.5 font-mono text-xs font-semibold">
            Ctrl
          </kbd>{' '}
          +{' '}
          <kbd className="rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-1.5 py-0.5 font-mono text-xs font-semibold">
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
          <Link href="/ib" className="ec-link">
            IB past papers
          </Link>
          {' · '}
          <Link href="/dashboard" className="ec-link">
            Dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}
