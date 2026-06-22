import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { listPosts } from '@/lib/community/posts'
import { sendCommunityDigestEmail } from '@/lib/email/community'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { SITE_URL } from '@/lib/site-config'

const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export async function sendCommunityDigestBatch(): Promise<{ sent: number; skipped: number }> {
  if (!isCommunityEnabled()) return { sent: 0, skipped: 0 }

  const admin = createServiceClient()
  const hotPosts = await listPosts({ sort: 'hot', limit: 8 })
  if (!hotPosts.length) return { sent: 0, skipped: 0 }

  const cutoff = new Date(Date.now() - DIGEST_INTERVAL_MS).toISOString()

  const { data: subscribers } = await admin
    .from('user_profiles')
    .select('id, full_name, subjects, community_digest_last_sent_at')
    .eq('email_community_digest', true)

  let sent = 0
  let skipped = 0

  for (const row of subscribers ?? []) {
    const lastSent = row.community_digest_last_sent_at as string | null
    if (lastSent && lastSent > cutoff) {
      skipped++
      continue
    }

    const userSubjects = (row.subjects as string[] | null) ?? []
    const subjectSet = new Set(userSubjects.map((s) => s.toLowerCase()))
    const matched =
      subjectSet.size === 0
        ? hotPosts.slice(0, 5)
        : hotPosts.filter((p) => subjectSet.has(p.subjectCode.toLowerCase())).slice(0, 5)
    const posts = matched.length ? matched : hotPosts.slice(0, 3)
    if (!posts.length) {
      skipped++
      continue
    }

    const { data: authData } = await admin.auth.admin.getUserById(row.id as string)
    const email = authData?.user?.email
    if (!email) {
      skipped++
      continue
    }

    sendCommunityDigestEmail({
      to: email,
      recipientName: row.full_name as string | null,
      unsubscribeHref: unsubscribeUrl(row.id as string, 'digest'),
      posts: posts.map((p) => ({
        title: p.title,
        href: `${SITE_URL}/community/posts/${p.id}`,
        score: p.score,
        commentCount: p.commentCount,
        subjectCode: p.subjectCode,
      })),
    })

    await admin
      .from('user_profiles')
      .update({ community_digest_last_sent_at: new Date().toISOString() })
      .eq('id', row.id)

    await admin.from('notifications').insert({
      user_id: row.id,
      type: 'digest',
      title: 'Trending discussions in Exam Room',
      href: '/community',
    })

    sent++
  }

  return { sent, skipped }
}
