import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <p className="ec-label-tech mb-4 justify-center">404</p>
        <h1 className="text-headline mb-3">Page not found</h1>
        <p className="text-body mb-8">
          That link may be broken, or the page may have moved. Head back to the
          dashboard or try marking a question.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="ec-btn-primary justify-center px-7 py-3.5">
            Go home
          </Link>
          <Link href="/mark" className="ec-btn-secondary justify-center px-7 py-3.5">
            Mark a question
          </Link>
          <Link href="/dashboard" className="ec-btn-ghost justify-center px-7 py-3.5">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
