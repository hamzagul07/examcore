import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-config'
import { sendCommunityReplyEmail } from '@/lib/email/community'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { getUserUsername } from '@/lib/community/require-username'

type NotificationType = 'comment' | 'reply' | 'digest' | 'upvote'

type RecipientPrefs = {
  email: string | null
  fullName: string | null
  emailCommunityReplies: boolean
}

const EMAIL_COOLDOWN_MS = 15 * 60 * 1000

async function loadRecipientPrefs(userId: string): Promise<RecipientPrefs | null> {
  const admin = createServiceClient()
  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin
      .from('user_profiles')
      .select('full_name, email_community_replies')
      .eq('id', userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ])

  if (!profile && !authData?.user) return null

  return {
    email: authData?.user?.email ?? null,
    fullName: (profile?.full_name as string | null) ?? null,
    emailCommunityReplies: profile?.email_community_replies !== false,
  }
}

async function shouldSendEmail(userId: string, href: string): Promise<boolean> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - EMAIL_COOLDOWN_MS).toISOString()
  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('href', href)
    .gte('created_at', since)
  return (count ?? 0) <= 1
}

async function pushNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  href: string
  sendEmail?: boolean
  emailKind?: 'comment' | 'reply'
  emailUserId?: string
  actorUsername?: string
  postTitle?: string
}): Promise<void> {
  const admin = createServiceClient()
  await admin.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href,
  })

  if (!input.sendEmail || !input.emailKind || !input.actorUsername || !input.postTitle) return

  const prefs = await loadRecipientPrefs(input.userId)
  if (!prefs?.email || !prefs.emailCommunityReplies) return
  if (!(await shouldSendEmail(input.userId, input.href))) return

  sendCommunityReplyEmail({
    to: prefs.email,
    recipientName: prefs.fullName,
    actorUsername: input.actorUsername,
    kind: input.emailKind,
    postTitle: input.postTitle,
    postHref: `${SITE_URL}${input.href}`,
    preview: input.body,
    unsubscribeHref: input.emailUserId
      ? unsubscribeUrl(input.emailUserId, 'replies')
      : undefined,
  })
}

/** Notify post author (top-level comment) or parent comment author (reply). */
export async function notifyCommentActivity(input: {
  postId: string
  commentId: string
  commentAuthorId: string
  parentId: string | null
  bodyPreview: string
}): Promise<void> {
  try {
    const admin = createServiceClient()
    const actorUsername = (await getUserUsername(input.commentAuthorId)) ?? 'Someone'
    const href = `/community/posts/${input.postId}#comment-${input.commentId}`

    const { data: post } = await admin
      .from('community_posts')
      .select('author_id, title')
      .eq('id', input.postId)
      .maybeSingle()
    if (!post) return

    const postTitle = (post.title as string) || 'your post'
    const recipients: { userId: string; type: 'comment' | 'reply'; title: string }[] = []

    if (input.parentId) {
      const { data: parent } = await admin
        .from('community_comments')
        .select('author_id')
        .eq('id', input.parentId)
        .maybeSingle()
      const parentAuthorId = parent?.author_id as string | undefined
      if (parentAuthorId && parentAuthorId !== input.commentAuthorId) {
        recipients.push({
          userId: parentAuthorId,
          type: 'reply',
          title: `u/${actorUsername} replied to your comment`,
        })
      }
    } else if (post.author_id !== input.commentAuthorId) {
      recipients.push({
        userId: post.author_id as string,
        type: 'comment',
        title: `New comment on "${postTitle.slice(0, 60)}"`,
      })
    }

    await Promise.all(
      recipients.map((r) =>
        pushNotification({
          userId: r.userId,
          type: r.type,
          title: r.title,
          body: input.bodyPreview,
          href,
          sendEmail: true,
          emailKind: r.type,
          emailUserId: r.userId,
          actorUsername,
          postTitle,
        })
      )
    )
  } catch (err) {
    console.error('[community/notify] comment activity failed:', err)
  }
}

const UPVOTE_EMAIL_COOLDOWN_MS = 60 * 60 * 1000

/** In-app only — someone upvoted your post (email off to avoid spam). */
export async function notifyPostUpvote(input: { postId: string; voterId: string }): Promise<void> {
  try {
    const admin = createServiceClient()
    const voterUsername = (await getUserUsername(input.voterId)) ?? 'Someone'
    const href = `/community/posts/${input.postId}`

    const { data: post } = await admin
      .from('community_posts')
      .select('author_id, title')
      .eq('id', input.postId)
      .maybeSingle()
    if (!post?.author_id || post.author_id === input.voterId) return

    const since = new Date(Date.now() - UPVOTE_EMAIL_COOLDOWN_MS).toISOString()
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', post.author_id)
      .eq('type', 'upvote')
      .eq('href', href)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return

    const postTitle = (post.title as string) || 'your post'
    await pushNotification({
      userId: post.author_id as string,
      type: 'upvote',
      title: `u/${voterUsername} upvoted "${postTitle.slice(0, 48)}"`,
      href,
      sendEmail: false,
    })
  } catch (err) {
    console.error('[community/notify] post upvote failed:', err)
  }
}
