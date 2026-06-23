import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-config'
import { sendCommunityMilestoneEmail, sendCommunityReplyEmail } from '@/lib/email/community'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { extractMentionUsernames, resolveMentionUserIds } from '@/lib/community/mentions'
import { getUserUsername } from '@/lib/community/require-username'

type NotificationType = 'comment' | 'reply' | 'digest' | 'upvote' | 'mention' | 'milestone' | 'comment_upvote'

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
  emailKind?: 'comment' | 'reply' | 'mention'
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

const COMMENT_UPVOTE_COOLDOWN_MS = 60 * 60 * 1000

/** In-app only — someone upvoted your comment. */
export async function notifyCommentUpvote(input: {
  commentId: string
  postId: string
  voterId: string
}): Promise<void> {
  try {
    const admin = createServiceClient()
    const voterUsername = (await getUserUsername(input.voterId)) ?? 'Someone'
    const href = `/community/posts/${input.postId}#comment-${input.commentId}`

    const { data: comment } = await admin
      .from('community_comments')
      .select('author_id, body_md')
      .eq('id', input.commentId)
      .maybeSingle()
    if (!comment?.author_id || comment.author_id === input.voterId) return

    const since = new Date(Date.now() - COMMENT_UPVOTE_COOLDOWN_MS).toISOString()
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', comment.author_id)
      .eq('type', 'comment_upvote')
      .eq('href', href)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return

    const preview = ((comment.body_md as string) || '').slice(0, 48)
    await pushNotification({
      userId: comment.author_id as string,
      type: 'comment_upvote',
      title: `u/${voterUsername} upvoted your comment`,
      body: preview || undefined,
      href,
      sendEmail: false,
    })
  } catch (err) {
    console.error('[community/notify] comment upvote failed:', err)
  }
}

const SCORE_MILESTONES = [5, 10, 25, 50, 100] as const
const MILESTONE_EMAIL_MIN = 25

/** In-app (+ email for 25+) when a post hits an upvote milestone. */
export async function notifyPostScoreMilestone(input: {
  postId: string
  score: number
  authorId: string
}): Promise<void> {
  try {
    if (!SCORE_MILESTONES.includes(input.score as (typeof SCORE_MILESTONES)[number])) return

    const admin = createServiceClient()
    const href = `/community/posts/${input.postId}`
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.authorId)
      .eq('type', 'milestone')
      .eq('href', href)
      .eq('body', String(input.score))
    if ((count ?? 0) > 0) return

    const { data: post } = await admin
      .from('community_posts')
      .select('title')
      .eq('id', input.postId)
      .maybeSingle()
    const postTitle = (post?.title as string) || 'your post'
    const title = `"${postTitle.slice(0, 48)}" reached ${input.score} upvotes`

    await admin.from('notifications').insert({
      user_id: input.authorId,
      type: 'milestone',
      title,
      body: String(input.score),
      href,
    })

    if (input.score < MILESTONE_EMAIL_MIN) return

    const prefs = await loadRecipientPrefs(input.authorId)
    if (!prefs?.email || !prefs.emailCommunityReplies) return

    sendCommunityMilestoneEmail({
      to: prefs.email,
      recipientName: prefs.fullName,
      postTitle,
      score: input.score,
      postHref: `${SITE_URL}${href}`,
      unsubscribeHref: unsubscribeUrl(input.authorId, 'replies'),
    })
  } catch (err) {
    console.error('[community/notify] post milestone failed:', err)
  }
}

/** Notify @mentioned users in post or comment text. */
export async function notifyMentions(input: {
  authorId: string
  postId: string
  commentId?: string
  text: string
  postTitle?: string
}): Promise<void> {
  try {
    const usernames = extractMentionUsernames(input.text)
    if (!usernames.length) return

    const resolved = await resolveMentionUserIds(usernames, input.authorId)
    if (!resolved.size) return

    const actorUsername = (await getUserUsername(input.authorId)) ?? 'Someone'
    const href = input.commentId
      ? `/community/posts/${input.postId}#comment-${input.commentId}`
      : `/community/posts/${input.postId}`
    const postTitle = input.postTitle || 'a discussion'
    const preview = input.text.replace(/\s+/g, ' ').trim().slice(0, 200)

    await Promise.all(
      [...resolved.values()].map((userId) =>
        pushNotification({
          userId,
          type: 'mention',
          title: `u/${actorUsername} mentioned you in "${postTitle.slice(0, 48)}"`,
          body: preview || undefined,
          href,
          sendEmail: true,
          emailKind: 'mention',
          emailUserId: userId,
          actorUsername,
          postTitle,
        })
      )
    )
  } catch (err) {
    console.error('[community/notify] mentions failed:', err)
  }
}
