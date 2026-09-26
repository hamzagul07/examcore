import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { listSeatRequests, parseSeatStatus, type SeatRequestStatus } from '@/lib/teacher/seat-grant'
import { SeatDecision } from './seat-decision'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Teacher seats',
  robots: { index: false, follow: false },
}

const TABS: Array<{ status: SeatRequestStatus; label: string }> = [
  { status: 'pending', label: 'Queue' },
  { status: 'declined', label: 'Declined' },
  { status: 'approved', label: 'Approved' },
]

function waited(createdAt: string): string {
  const days = Math.floor((Date.now() - Date.parse(createdAt)) / 86_400_000)
  if (days <= 0) return 'today'
  return days === 1 ? '1 day' : `${days} days`
}

function day(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—'
}

/**
 * The teacher seat queue — the page that answers `pnpm teacher:grant --pending`
 * without a terminal. Gated here, per page, as well as by the /admin proxy
 * rule: the proxy is one misconfigured matcher away from not running, and a
 * page that grants paid allowances must not depend on it alone.
 */
export default async function TeacherSeatsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/dashboard')

  const sp = await searchParams
  const status = parseSeatStatus(sp.status ?? null) ?? 'pending'

  let page: Awaited<ReturnType<typeof listSeatRequests>> | null = null
  let loadError = false
  try {
    page = await listSeatRequests(createServiceClient(), { status, cursor: sp.cursor ?? null })
  } catch (err) {
    console.error('[admin/teacher-seats] list failed:', err instanceof Error ? err.message : err)
    loadError = true
  }

  return (
    <div className="mx-auto min-w-0 max-w-[860px]">
      <header className="ms-teacher-desk-head">
        <div className="min-w-0">
          <div className="ms-teacher-desk-head__eyebrow">
            <p className="ec-eyebrow mb-0">Admin</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              SEAT
            </span>
          </div>
          <h1 className="text-headline">Teacher seats</h1>
          <p className="text-body mt-2 max-w-2xl">
            A seat gives the teacher their free marking allowance and every student in their classes
            the class bonus. Check the school and the email domain before approving.
          </p>
        </div>
      </header>

      <nav className="ms-teacher-tabs" aria-label="Request status">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/teacher-seats?status=${t.status}`}
            className="ms-teacher-tabs__tab"
            aria-current={t.status === status ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {loadError ? (
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__title">Couldn’t load the requests</p>
          <p className="ms-teacher-error__body">Refresh the page to try again.</p>
        </div>
      ) : !page || page.requests.length === 0 ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            {status === 'pending' ? 'OK' : '—'}
          </span>
          <h2 className="ms-teacher-empty__title">
            {status === 'pending' ? 'No one is waiting' : `No ${status} requests`}
          </h2>
          <p className="ms-teacher-empty__body">
            {status === 'pending'
              ? 'New requests arrive here and in the admin inbox.'
              : 'Decisions appear here once they are made.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="ms-seat-queue">
            {page.requests.map((r) => (
              <li
                key={r.id}
                className={`ms-seat-queue__slip${r.status !== 'pending' ? ` ms-seat-queue__slip--${r.status}` : ''}`}
              >
                <h2 className="ms-seat-queue__school">{r.school_name}</h2>
                <dl className="ms-seat-queue__facts">
                  <dt>Account</dt>
                  <dd>{r.account_email ?? r.user_id}</dd>
                  <dt>School email</dt>
                  <dd>{r.school_email}</dd>
                  {r.role_title ? (
                    <>
                      <dt>Role</dt>
                      <dd>{r.role_title}</dd>
                    </>
                  ) : null}
                  {r.class_size ? (
                    <>
                      <dt>Students</dt>
                      <dd>{r.class_size}</dd>
                    </>
                  ) : null}
                  {r.school_country ? (
                    <>
                      <dt>Country</dt>
                      <dd>{r.school_country}</dd>
                    </>
                  ) : null}
                  <dt>{r.status === 'pending' ? 'Waiting' : 'Asked'}</dt>
                  <dd>{r.status === 'pending' ? waited(r.created_at) : day(r.created_at)}</dd>
                  {r.status !== 'pending' ? (
                    <>
                      <dt>Decided</dt>
                      <dd>{day(r.reviewed_at)}</dd>
                      <dt>Reason</dt>
                      <dd>{r.reviewed_reason ?? '—'}</dd>
                    </>
                  ) : null}
                </dl>
                {r.status === 'pending' ? <SeatDecision requestId={r.id} school={r.school_name} /> : null}
              </li>
            ))}
          </ul>
          {page.next_cursor ? (
            <p className="mt-6">
              <Link
                href={`/admin/teacher-seats?status=${status}&cursor=${encodeURIComponent(page.next_cursor)}`}
                className="ec-btn-secondary inline-flex min-h-[44px] items-center"
              >
                {status === 'pending' ? 'Newer requests' : 'Older requests'} →
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
