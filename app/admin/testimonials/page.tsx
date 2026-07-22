import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { ApprovalButtons } from './approval-buttons'

export const dynamic = 'force-dynamic'

type FeedbackRow = {
  id: string
  rating: string
  reason: string | null
  comment: string | null
  display_name: string | null
  subject_code: string | null
  marks_earned: number | null
  total_marks: number | null
  share_consent: boolean
  approved_at: string | null
  created_at: string
}

const cardStyle = {
  border: '1px solid var(--ec-border)',
  borderRadius: 14,
} as const

function scoreLabel(row: FeedbackRow): string | null {
  if (row.marks_earned == null || row.total_marks == null) return null
  return `${row.marks_earned}/${row.total_marks}`
}

/**
 * Testimonial approval + marking-quality review.
 *
 * Approval lives here because `approved_at` is writable from nowhere else —
 * students hold no write grant on the table, so consent alone can never put a
 * quote on the homepage. Publishing always takes a human.
 *
 * The thumbs-down list is the more operationally useful half: it is the only
 * direct read on whether the marking is actually any good.
 */
export default async function AdminTestimonialsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/dashboard')

  const admin = createServiceClient()

  const [{ data: pending }, { data: published }, { data: negative }] =
    await Promise.all([
      admin
        .from('mark_feedback')
        .select('*')
        .eq('rating', 'up')
        .eq('share_consent', true)
        .is('approved_at', null)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('mark_feedback')
        .select('*')
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: false })
        .limit(50),
      admin
        .from('mark_feedback')
        .select('*')
        .eq('rating', 'down')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

  const pendingRows = (pending ?? []) as FeedbackRow[]
  const publishedRows = (published ?? []) as FeedbackRow[]
  const negativeRows = (negative ?? []) as FeedbackRow[]

  return (
    <div className="mx-auto max-w-[860px] px-4">
      <h1 className="ms-h2" style={{ marginBottom: 4 }}>
        Student feedback
      </h1>
      <p
        className="ms-body-2"
        style={{ color: 'var(--ec-text-secondary)', marginBottom: 28 }}
      >
        Quotes need the student&apos;s consent <em>and</em> your approval before
        they appear on the homepage. Revising their feedback withdraws approval
        automatically.
      </p>

      <Section title={`Awaiting approval (${pendingRows.length})`}>
        {pendingRows.length === 0 ? (
          <Empty>
            Nothing waiting. Quotes appear here once a student leaves positive
            feedback with a comment and ticks the share box.
          </Empty>
        ) : (
          pendingRows.map((row) => (
            <li key={row.id} className="ms-sd-card ms-sd-card-pad" style={cardStyle}>
              <Meta row={row} />
              <blockquote style={{ margin: '8px 0 12px', fontSize: 15 }}>
                &ldquo;{row.comment}&rdquo;
              </blockquote>
              <ApprovalButtons id={row.id} approved={false} />
            </li>
          ))
        )}
      </Section>

      <Section title={`Live on the homepage (${publishedRows.length})`}>
        {publishedRows.length === 0 ? (
          <Empty>
            Nothing published yet — the homepage proof section stays hidden
            until something is here.
          </Empty>
        ) : (
          publishedRows.map((row) => (
            <li key={row.id} className="ms-sd-card ms-sd-card-pad" style={cardStyle}>
              <Meta row={row} />
              <blockquote style={{ margin: '8px 0 12px', fontSize: 15 }}>
                &ldquo;{row.comment}&rdquo;
              </blockquote>
              <ApprovalButtons id={row.id} approved />
            </li>
          ))
        )}
      </Section>

      <Section title={`Marked unfair (${negativeRows.length})`}>
        {negativeRows.length === 0 ? (
          <Empty>No one has flagged a mark as unfair.</Empty>
        ) : (
          negativeRows.map((row) => (
            <li key={row.id} className="ms-sd-card ms-sd-card-pad" style={cardStyle}>
              <p className="ms-overline" style={{ margin: 0 }}>
                {row.reason ? row.reason.replace(/_/g, ' ') : 'no reason given'}
                {row.subject_code ? ` · ${row.subject_code}` : ''}
                {scoreLabel(row) ? ` · scored ${scoreLabel(row)}` : ''}
                {' · '}
                {new Date(row.created_at).toLocaleDateString('en-GB')}
              </p>
              {row.comment && (
                <p className="ms-body-2" style={{ marginTop: 8 }}>
                  {row.comment}
                </p>
              )}
            </li>
          ))
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 className="ms-h3" style={{ marginBottom: 12 }}>
        {title}
      </h2>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {children}
      </ul>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <li
      className="ms-body-2"
      style={{ color: 'var(--ec-text-secondary)', listStyle: 'none' }}
    >
      {children}
    </li>
  )
}

function Meta({ row }: { row: FeedbackRow }) {
  return (
    <p className="ms-overline" style={{ margin: 0 }}>
      {row.display_name?.trim() || 'anonymous'}
      {row.subject_code ? ` · ${row.subject_code}` : ''}
      {scoreLabel(row) ? ` · scored ${scoreLabel(row)}` : ''}
      {' · '}
      {new Date(row.created_at).toLocaleDateString('en-GB')}
    </p>
  )
}
