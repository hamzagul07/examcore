import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

/** NavBoost / satisfaction — complete the task on-site (mark a paper). */
export function BlogTaskCompleteCta() {
  return (
    <section className="ms-blog-cta-block my-10" aria-label="Next step">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--ec-brand)]" aria-hidden />
        <div>
          <h2 className="ms-h3">Apply this on a real past paper</h2>
          <p className="ms-body-2" style={{ marginTop: 8 }}>
            Upload one question you already attempted — get mark-by-mark feedback in about a
            minute so you don&apos;t need to bounce back to Google for a second answer.
          </p>
          <Link href="/mark" className="ec-btn-primary mt-4 inline-flex min-h-[48px] text-sm">
            Mark a question free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
