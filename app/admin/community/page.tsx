import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { getModerationQueue } from '@/lib/community/admin'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { ModerationButtons } from './moderation-buttons'

export const dynamic = 'force-dynamic'

export default async function AdminCommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/dashboard')

  const queue = await getModerationQueue()

  return (
    <div className="mx-auto max-w-[860px] px-4">
      <h1 className="ms-h2" style={{ marginBottom: 4 }}>
        Community moderation
      </h1>
      <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)', marginBottom: 24 }}>
        Notes auto-flagged by reports or held by the AI gate. {queue.length} pending.
      </p>

      {queue.length === 0 ? (
        <p className="ms-body-2">Nothing to review. 🎉</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {queue.map((n) => (
            <li
              key={n.id}
              className="ms-sd-card ms-sd-card-pad"
              style={{ border: '1px solid var(--ec-border)', borderRadius: 14 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <p className="ms-overline" style={{ margin: 0 }}>
                    {n.status === 'flagged' ? `⚑ ${n.reportCount} report(s)` : '🤖 held by AI gate'} ·{' '}
                    {n.board} · {n.subjectCode}
                  </p>
                  <strong style={{ fontSize: 16 }}>{n.title}</strong>{' '}
                  <span style={{ color: 'var(--ec-text-faint)', fontSize: 13 }}>
                    by {n.authorUsername ? `@${n.authorUsername}` : n.authorId.slice(0, 8)}
                  </span>
                </div>
                <Link href={`/community/notes/${n.id}`} className="ec-btn-underline text-sm">
                  open →
                </Link>
              </div>
              <div className="community-note-body" style={{ maxHeight: 240, overflow: 'auto', margin: '8px 0 14px' }}>
                <CommunityMarkdown content={n.contentMd} />
              </div>
              <ModerationButtons noteId={n.id} status={n.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
