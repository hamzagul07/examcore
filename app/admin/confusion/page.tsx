import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import {
  diagnoseBlock,
  groupByBlock,
  type ExplanationDemandRow,
} from '@/lib/courses/confusion-report'

export const dynamic = 'force-dynamic'

/**
 * Which paragraphs the catalogue explains worst.
 *
 * Every "Explain more" tap is a labelled confusion signal on an exact paragraph,
 * and the intent the student picked says *how* it failed:
 *
 *   Simpler  -> the wording is too dense
 *   Why?     -> it asserts without justifying
 *   Show me  -> it is too abstract, no concrete referent
 *
 * That turns a popularity counter into a prescription. Nothing else in the
 * product produces this signal: marking tells us which topics students get
 * wrong, this tells us which sentences they cannot follow in the first place.
 *
 * Read-only aggregate — no user is attached to a row, so nothing here is
 * personal data.
 */

const INTENT_DIAGNOSIS: Record<string, string> = {
  simpler: 'wording too dense',
  why: 'asserts without justifying',
  example: 'too abstract — no concrete case',
}

const card = {
  border: '1px solid var(--ec-border)',
  borderRadius: 14,
  padding: '14px 18px',
} as const

export default async function ConfusionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/')

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('lesson_explanations')
    .select('subject_code, lesson_slug, block_key, intent, request_count, body, updated_at')
    .order('request_count', { ascending: false })
    .limit(500)

  const rows = (data ?? []) as ExplanationDemandRow[]
  const blocks = groupByBlock(rows)
  const totalTaps = rows.reduce((n, r) => n + (r.request_count ?? 0), 0)

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        ADMIN · CONFUSION REPORT
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 8 }}>
        Paragraphs students cannot follow
      </h1>
      <p className="body-2" style={{ color: 'var(--ec-text-secondary)', marginBottom: 24 }}>
        Ranked by how often readers asked for help on that exact paragraph. The
        dominant intent says how the writing failed, which is what to fix.
      </p>

      {error ? (
        <div style={{ ...card, borderColor: 'var(--ec-danger, #b00)' }}>
          <p className="body-2">Could not read lesson_explanations: {error.message}</p>
        </div>
      ) : null}

      <div style={{ ...card, marginBottom: 20 }}>
        <p className="body-2" style={{ margin: 0 }}>
          <strong>{blocks.length}</strong> paragraphs have been asked about ·{' '}
          <strong>{totalTaps}</strong> total taps · <strong>{rows.length}</strong> cached
          explanations
        </p>
        {!rows.length ? (
          <p className="body-2" style={{ marginTop: 8, color: 'var(--ec-text-secondary)' }}>
            Nothing yet. The cache fills as students use the Simpler / Why? / Show me
            buttons on lesson pages — this becomes useful once it has warmed.
          </p>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.map((b) => {
          const diagnosis = diagnoseBlock(b)
          return (
            <div key={`${b.lessonSlug}:${b.blockKey}`} style={card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <span className="ec-label-tech">
                  {b.subjectCode} · {b.lessonSlug}
                </span>
                <span className="ec-label-tech">
                  {b.total} tap{b.total === 1 ? '' : 's'}
                </span>
              </div>
              <p className="body-2" style={{ margin: '8px 0 0' }}>
                {diagnosis
                  ? `Mostly “${diagnosis}” — ${INTENT_DIAGNOSIS[diagnosis] ?? ''}`
                  : 'No dominant intent — asked about in several different ways.'}
              </p>
              <p
                className="body-2"
                style={{ margin: '6px 0 0', color: 'var(--ec-text-secondary)' }}
              >
                {b.byIntent
                  .map((x) => `${x.intent} ×${x.count}`)
                  .join(' · ')}
              </p>
              <p
                className="body-2"
                style={{
                  margin: '10px 0 0',
                  color: 'var(--ec-text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {b.sample.slice(0, 200)}
                {b.sample.length > 200 ? '…' : ''}
              </p>
            </div>
          )
        })}
      </div>
    </main>
  )
}
