import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ParentReportCard } from '@/components/mark/ParentReportCard'
import { buildShareReportFromAttempt } from '@/lib/marking/share-report-data'
import { verifyMarkShareToken, markShareUrl } from '@/lib/marking/share-token'
import { SITE_URL } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function loadReport(token: string) {
  const verified = verifyMarkShareToken(token)
  if (!verified) return null

  const { data: attempt } = await admin()
    .from('attempts')
    .select(
      'id, marks_earned, total_marks, question_text, syllabus_tags, ai_marking, source_type'
    )
    .eq('id', verified.attemptId)
    .maybeSingle()

  if (!attempt) return null

  const report = buildShareReportFromAttempt(attempt, {
    subjectCode: verified.subjectCode,
    paperRef: verified.paperRef,
  })
  if (!report) return null
  return { report, shareUrl: markShareUrl(token), attemptId: attempt.id }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const loaded = await loadReport(decodeURIComponent(token))
  if (!loaded) {
    return { title: 'Mark report · MarkScheme', robots: { index: false } }
  }
  const { report, shareUrl } = loaded
  const title = `${report.marksEarned}/${report.totalMarks} · ${report.bandLabel} · MarkScheme`
  const description = report.subjectLabel
    ? `${report.subjectLabel}: ${report.marksEarned} out of ${report.totalMarks} (${report.percentage}%). Examiner-style mark report.`
    : `Scored ${report.marksEarned}/${report.totalMarks} (${report.percentage}%). Examiner-style mark report on MarkScheme.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: 'MarkScheme',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: { canonical: shareUrl },
  }
}

export default async function MarkShareReportPage({ params }: Props) {
  const { token } = await params
  const loaded = await loadReport(decodeURIComponent(token))
  if (!loaded) notFound()

  const { report } = loaded

  return (
    <main className="app-shell min-h-screen bg-[var(--ec-bg)] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-wide text-[var(--ec-text-secondary)]">
          Shared mark report · markscheme.app
        </p>
        <ParentReportCard report={report} />
        <p className="mt-8 text-center text-sm text-[var(--ec-text-secondary)]">
          Want the same feedback on your next paper?{' '}
          <Link href="/mark" className="ec-link font-semibold">
            Mark on MarkScheme
          </Link>
        </p>
        <p className="mt-2 text-center font-mono text-[11px] text-[var(--ec-text-secondary)]">
          {SITE_URL.replace(/^https?:\/\//, '')}
        </p>
      </div>
    </main>
  )
}
