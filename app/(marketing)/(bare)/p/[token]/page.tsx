import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

import { ParentProgressReportCard } from '@/components/reports/ParentProgressReportCard'
import { ParentReportViewTracker } from '@/components/reports/ParentReportViewTracker'
import { buildParentReport } from '@/lib/reports/parent-report'
import { verifyProgressShareToken, progressShareUrl } from '@/lib/marking/share-token'
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getPricingDisplay } from '@/lib/billing/display-prices'
import { formatMoney } from '@/lib/billing/format'

/**
 * The parent-facing progress report — CONVERSION_PSYCHOLOGY.md §8a.
 *
 * Reached only with a signed link the student generated for themselves. Not
 * indexed, and it carries nothing that could embarrass its subject: see
 * lib/reports/parent-report.ts for what the report is allowed to contain.
 *
 * Dynamic because the report is per-user and changes every time they mark
 * something; there is nothing here worth caching for the one or two people who
 * will ever open a given link.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

/** The same query shape the weekly report uses, capped for the same reason. */
const ATTEMPT_LIMIT = 500

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function firstNameOf(fullName: unknown): string | null {
  if (typeof fullName !== 'string') return null
  const first = fullName.trim().split(/\s+/)[0]
  return first ? first.slice(0, 40) : null
}

/**
 * Cached for the render pass: generateMetadata and the page body both need the
 * report, and without this every view runs two profile reads and two 500-row
 * attempt queries against the service role.
 */
const loadReport = cache(async (rawToken: string) => {
  const verified = verifyProgressShareToken(rawToken)
  if (!verified) return null

  const db = admin()

  const { data: profile } = await db
    .from('user_profiles')
    .select('full_name, target_grade, exam_date')
    .eq('id', verified.userId)
    .maybeSingle()

  const [{ data: rawAttempts }, { count }] = await Promise.all([
    db
      .from('attempts')
      .select(
        'id, marks_earned, total_marks, syllabus_tags, created_at, question_text, mark_schemes ( paper_code )'
      )
      .eq('user_id', verified.userId)
      .order('created_at', { ascending: false })
      .limit(ATTEMPT_LIMIT),
    // The headline figure is the whole point of the page, so it is counted
    // rather than inferred from a capped page of rows.
    db
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', verified.userId),
  ])

  const attempts = (rawAttempts ?? []) as unknown as AttemptWithPaper[]

  // A link for an account that has marked nothing has nothing to report, and a
  // page of zeroes is worse for the student than no page at all.
  if (attempts.length === 0) return null

  const report = buildParentReport(
    attempts,
    {
      target_grade: (profile?.target_grade as string | null) ?? null,
      exam_date: (profile?.exam_date as string | null) ?? null,
    },
    { totalMarksCompleted: count ?? undefined }
  )

  // First name only, and only because the student chose to send this link to
  // someone who already knows them. Nothing else from the profile is used.
  return { report, studentFirstName: firstNameOf(profile?.full_name) }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Next hands the segment over already percent-decoded. Decoding it a second
  // time is a no-op for base64url and throws URIError on anything containing a
  // stray '%', turning an intended 404 into an unhandled 500.
  const { token } = await params
  const loaded = await loadReport(token)
  const robots = { index: false, follow: false }
  if (!loaded) {
    return { title: 'Progress report · MarkScheme', robots }
  }
  const { report, studentFirstName } = loaded
  const who = studentFirstName ? `${studentFirstName}'s` : 'A student'
  const title = `${who} exam practice · ${report.marksCompleted} questions marked`
  return {
    title,
    description: `${report.marksCompleted} exam questions marked against the official mark scheme.`,
    robots,
    alternates: { canonical: progressShareUrl(token) },
    openGraph: { title, type: 'website', siteName: 'MarkScheme' },
  }
}

export default async function ParentProgressPage({ params }: Props) {
  const { token } = await params
  const loaded = await loadReport(token)
  if (!loaded) notFound()

  const { report, studentFirstName } = loaded
  const prices = await getPricingDisplay()
  const yearly = formatMoney(prices.scholar.yearly.amountCents, prices.currency)
  const who = studentFirstName ?? 'They'

  return (
    <main className="app-shell min-h-screen bg-[var(--ec-bg)] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-xl">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-wide text-[var(--ec-text-secondary)]">
          Shared progress report · markscheme.app
        </p>

        <ParentProgressReportCard report={report} studentFirstName={studentFirstName} />
        <ParentReportViewTracker />

        {/* The ask, aimed at the person reading — §8b. The comparison is one a
            parent can check for themselves; we quote only our own price. */}
        <section className="ec-card mx-auto mt-8 max-w-xl p-6 sm:p-7">
          <p className="ec-label-tech mb-3">FOR THE PERSON PAYING</p>
          <h2 className="text-lg font-semibold text-[var(--ec-text-primary)]">
            A tutor marks one paper an hour.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            MarkScheme marks every question {who === 'They' ? 'they write' : `${who} writes`},
            all year, against the official Cambridge and IB mark schemes — with the
            marks shown where they were won and lost. {yearly} for the exam year.
            Compare that with an hour of private tutoring.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link href="/pricing" className="ec-btn-primary inline-flex px-5 py-2.5 text-sm">
              See the plans →
            </Link>
            <Link href="/how-it-works" className="ec-btn-underline text-sm">
              How the marking works
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-[var(--ec-text-secondary)]">
          This link was generated by the student and expires on its own. It is not
          listed or indexed anywhere.
        </p>
      </div>
    </main>
  )
}
