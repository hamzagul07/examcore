import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { ApplicationActions, SeatToggle } from '@/components/admin/CreatorAdminActions'

export const dynamic = 'force-dynamic'

type ApplicationRow = {
  id: string
  user_id: string
  handle_wanted: string
  display_name: string
  tagline: string | null
  tiktok: string | null
  instagram: string | null
  youtube: string | null
  exams: string | null
  audience_size: string | null
  is_adult: boolean
  message: string | null
  status: string
  reviewed_reason: string | null
  created_at: string
}

type SeatRow = {
  user_id: string
  code: string
  status: 'active' | 'paused'
  verified_at: string
  verified_reason: string | null
  gift_marks: number
  gift_pool_monthly: number
}

const AUDIENCE_LABEL: Record<string, string> = {
  under_1k: 'under 1k',
  '1k_10k': '1k–10k',
  '10k_50k': '10k–50k',
  '50k_plus': '50k+',
}

function suggestCode(handle: string): string {
  const cleaned = handle.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.slice(0, 8) || 'CREATOR'
}

function link(raw: string | null, base: string): string | null {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  return `${base}${raw.replace(/^@/, '')}`
}

/** Applications to review, seats to pause, and the ledger — the founder's desk for the program. */
export default async function AdminCreatorsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/dashboard')

  const admin = createServiceClient()
  const [{ data: pending }, { data: reviewed }, { data: seats }, { data: conversions }] =
    await Promise.all([
      admin
        .from('creator_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      admin
        .from('creator_applications')
        .select('*')
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(10),
      admin
        .from('creators')
        .select('user_id, code, status, verified_at, verified_reason, gift_marks, gift_pool_monthly')
        .order('verified_at', { ascending: false }),
      admin
        .from('creator_conversions')
        .select('creator_id, tier, event, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  const seatRows = (seats ?? []) as SeatRow[]
  const ids = [
    ...new Set([
      ...seatRows.map((s) => s.user_id),
      ...((pending ?? []) as ApplicationRow[]).map((a) => a.user_id),
    ]),
  ]
  const { data: profiles } = ids.length
    ? await admin.from('user_profiles').select('id, username').in('id', ids)
    : { data: [] as { id: string; username: string | null }[] }
  const usernames = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string | null]))

  return (
    <div className="ms-cr-page" style={{ paddingTop: 0 }}>
      <div className="ms-cr-section__head">
        <h1 className="ms-cr-section__title">Creators</h1>
        <span className="ms-cr-section__note">
          {pending?.length ?? 0} to review · {seatRows.length} seats ·{' '}
          <Link href="/creators" className="ec-btn-underline">
            public page
          </Link>
        </span>
      </div>

      <section className="ms-cr-section" style={{ marginTop: 20 }}>
        <h2 className="ms-cr-section__title" style={{ fontSize: 22, marginBottom: 12 }}>
          Applications to review
        </h2>
        {(pending ?? []).length ? (
          <div className="ms-cr-admin-grid">
            {((pending ?? []) as ApplicationRow[]).map((a) => (
              <article key={a.id} className="ms-cr-admin-card">
                <p className="ms-cr-tip__meta">
                  {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·
                  audience {AUDIENCE_LABEL[a.audience_size ?? ''] ?? '—'} · says {a.is_adult ? '18+' : 'under 18'}
                  {usernames.get(a.user_id) ? ` · account @${usernames.get(a.user_id)}` : ''}
                </p>
                <h3 className="ms-cr-tipcard__title">
                  {a.display_name} <span className="ms-cr-card__handle">wants @{a.handle_wanted}</span>
                </h3>
                {a.tagline ? <p className="ms-cr-tipcard__tip">{a.tagline}</p> : null}
                <p className="ms-cr-tipcard__stats">
                  {link(a.tiktok, 'https://www.tiktok.com/@') ? (
                    <a href={link(a.tiktok, 'https://www.tiktok.com/@')!} target="_blank" rel="noopener noreferrer nofollow" className="ec-btn-underline">
                      TikTok {a.tiktok}
                    </a>
                  ) : null}
                  {link(a.instagram, 'https://www.instagram.com/') ? (
                    <a href={link(a.instagram, 'https://www.instagram.com/')!} target="_blank" rel="noopener noreferrer nofollow" className="ec-btn-underline">
                      Instagram {a.instagram}
                    </a>
                  ) : null}
                  {link(a.youtube, 'https://www.youtube.com/@') ? (
                    <a href={link(a.youtube, 'https://www.youtube.com/@')!} target="_blank" rel="noopener noreferrer nofollow" className="ec-btn-underline">
                      YouTube {a.youtube}
                    </a>
                  ) : null}
                  {a.exams ? <span>Exams: {a.exams}</span> : null}
                </p>
                {a.message ? <p className="ms-cr-tipcard__tip" style={{ whiteSpace: 'pre-wrap' }}>{a.message}</p> : null}
                <ApplicationActions applicationId={a.id} suggestedCode={suggestCode(a.handle_wanted)} />
              </article>
            ))}
          </div>
        ) : (
          <p className="ms-cr-empty">Nothing waiting. Applications land here from /creators.</p>
        )}
      </section>

      <section className="ms-cr-section">
        <h2 className="ms-cr-section__title" style={{ fontSize: 22, marginBottom: 12 }}>
          Seats
        </h2>
        {seatRows.length ? (
          <div className="overflow-x-auto">
            <table className="ms-cr-runs">
              <thead>
                <tr>
                  <th>Handle</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Gift / pool</th>
                  <th>Since</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {seatRows.map((s) => (
                  <tr key={s.user_id}>
                    <td>
                      {usernames.get(s.user_id) ? (
                        <Link href={`/with/${usernames.get(s.user_id)}`} className="ec-btn-underline">
                          @{usernames.get(s.user_id)}
                        </Link>
                      ) : (
                        <span className="ms-cr-card__handle">(no username)</span>
                      )}
                    </td>
                    <td className="is-num" style={{ textAlign: 'left' }}>{s.code}</td>
                    <td>
                      <span className={`ms-cr-runs__pill${s.status === 'active' ? ' ms-cr-runs__pill--ok' : ''}`}>{s.status}</span>
                    </td>
                    <td className="is-num" style={{ textAlign: 'left' }}>
                      {s.gift_marks} / {s.gift_pool_monthly}
                    </td>
                    <td>{new Date(s.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td className="ms-cr-card__handle">{s.verified_reason ?? '—'}</td>
                    <td>
                      <SeatToggle userId={s.user_id} status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ms-cr-empty">No seats yet.</p>
        )}
      </section>

      <section className="ms-cr-section">
        <h2 className="ms-cr-section__title" style={{ fontSize: 22, marginBottom: 12 }}>
          Recently reviewed
        </h2>
        {(reviewed ?? []).length ? (
          <ul className="ms-cr-tips">
            {((reviewed ?? []) as ApplicationRow[]).map((a) => (
              <li key={a.id} className="ms-cr-tip" style={{ borderLeftColor: a.status === 'approved' ? 'var(--ec-brand)' : 'var(--ec-border-strong, var(--ec-border))' }}>
                <span className="ms-cr-tip__meta">
                  {a.status} · {a.reviewed_reason ?? 'no note'}
                </span>
                <span className="ms-cr-tip__title" style={{ display: 'block' }}>
                  {a.display_name} · @{a.handle_wanted}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-cr-empty">No reviews yet.</p>
        )}
      </section>

      <section className="ms-cr-section">
        <h2 className="ms-cr-section__title" style={{ fontSize: 22, marginBottom: 12 }}>
          Paid conversions attributed to creators
        </h2>
        {(conversions ?? []).length ? (
          <ul className="ms-cr-tips">
            {(conversions ?? []).map((c, i) => (
              <li key={i} className="ms-cr-tip">
                <span className="ms-cr-tip__meta">
                  {new Date(c.created_at as string).toLocaleDateString('en-GB')} · {c.event as string}
                </span>
                <span className="ms-cr-tip__title" style={{ display: 'block' }}>
                  @{usernames.get(c.creator_id as string) ?? (c.creator_id as string).slice(0, 8)} · {(c.tier as string | null) ?? 'unknown tier'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-cr-empty">None yet. Rows appear when an attributed account activates a subscription.</p>
        )}
      </section>
    </div>
  )
}
