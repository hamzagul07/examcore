import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-config'
import { sendCommunityMilestoneEmail, sendCommunityReplyEmail } from '@/lib/email/community'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { extractMentionUsernames, resolveMentionUserIds } from '@/lib/community/mentions'
import { getUserUsername } from '@/lib/community/require-username'

type NotificationType =
  | 'comment'
  | 'reply'
  | 'digest'
  | 'upvote'
  | 'mention'
  | 'milestone'
  | 'comment_upvote'
  | 'thread'
  /** Your content was hidden pending review (reports or AI screen). */
  | 'moderation'

type RecipientPrefs = {
  email: string | null
  fullName: string | null
  emailCommunityReplies: boolean
  emailCommunityThreads: boolean
}

const EMAIL_COOLDOWN_MS = 15 * 60 * 1000

async function loadRecipientPrefs(userId: string): Promise<RecipientPrefs | null> {
  const admin = createServiceClient()
  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin
      .from('user_profiles')
      .select('full_name, email_community_replies, email_community_threads')
      .eq('id', userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ])

  if (!profile && !authData?.user) return null

  return {
    email: authData?.user?.email ?? null,
    fullName: (profile?.full_name as string | null) ?? null,
    emailCommunityReplies: profile?.email_community_replies !== false,
    emailCommunityThreads: Boolean(profile?.email_community_threads),
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
  /** Who caused it; keys the per-sender email cooldown. Absent for system notices. */
  actorId?: string
  sendEmail?: boolean
  emailKind?: 'comment' | 'reply' | 'mention' | 'thread'
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
    actor_id: input.actorId ?? null,
  })

  if (!input.sendEmail || !input.emailKind || !input.actorUsername || !input.postTitle) return

  const prefs = await loadRecipientPrefs(input.userId)
  const emailOn =
    input.emailKind === 'thread'
      ? prefs?.emailCommunityThreads
      : prefs?.emailCommunityReplies
  if (!prefs?.email || !emailOn) return
  if (!(await shouldSendEmail(input.userId, input.href))) return

  sendCommunityReplyEmail({
    to: prefs.email,
    recipientName: prefs.fullName,
    actorUsername: input.actorUsername,
    kind: input.emailKind,
    postTitle: input.postTitle,
    postHref: `${SITE_URL}${input.href}`,
    preview: input.body,
    // The recipient is `userId` — the same account whose prefs were just read,
    // so the opt-out always belongs to the person actually being emailed.
    unsubscribeHref: unsubscribeUrl(
      input.userId,
      input.emailKind === 'thread' ? 'threads' : 'replies'
    ),
  })
}

const THREAD_COOLDOWN_MS = 60 * 60 * 1000

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
          actorId: input.commentAuthorId,
          sendEmail: true,
          emailKind: r.type,
          actorUsername,
          postTitle,
        })
      )
    )

    const postAuthorId = post.author_id as string
    const alreadyNotified = new Set(recipients.map((r) => r.userId))
    if (
      input.parentId &&
      postAuthorId !== input.commentAuthorId &&
      !alreadyNotified.has(postAuthorId)
    ) {
      const postHref = `/community/posts/${input.postId}`
      const since = new Date(Date.now() - THREAD_COOLDOWN_MS).toISOString()
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', postAuthorId)
        .eq('type', 'thread')
        .like('href', `${postHref}%`)
        .gte('created_at', since)
      if ((count ?? 0) === 0) {
        await pushNotification({
          userId: postAuthorId,
          type: 'thread',
          title: `New activity on "${postTitle.slice(0, 48)}"`,
          body: input.bodyPreview,
          href,
          actorId: input.commentAuthorId,
          sendEmail: true,
          emailKind: 'thread',
          actorUsername,
          postTitle,
        })
      }
    }
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
      actorId: input.voterId,
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
      actorId: input.voterId,
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

const MENTION_EMAIL_COOLDOWN_MS = 60 * 60 * 1000

/**
 * At most one mention EMAIL per (recipient, sender) per hour.
 *
 * The generic cooldown in `shouldSendEmail` is keyed on `href`, and for a
 * comment the href carries `#comment-<id>` — unique per comment, so it never
 * fired and every "@victim" comment in a loop was an email (code review
 * 2026-09-25, §2 Community). Keying on who is mentioning whom is the thing
 * that actually bounds it. The in-app row is still written; only the email
 * is held back.
 */
async function mentionEmailAllowed(recipientId: string, actorId: string): Promise<boolean> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - MENTION_EMAIL_COOLDOWN_MS).toISOString()
  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', recipientId)
    .eq('actor_id', actorId)
    .eq('type', 'mention')
    .gte('created_at', since)
  return (count ?? 0) === 0
}

/**
 * Notify @mentioned users in post or comment text. `extractMentionUsernames`
 * caps the distinct names per body (MAX_MENTIONS_PER_BODY), so one comment
 * cannot fan out to the whole leaderboard.
 */
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
      [...resolved.values()].map(async (userId) => {
        // Checked BEFORE the row for this mention is written, so the count is
        // of earlier mentions only.
        const emailAllowed = await mentionEmailAllowed(userId, input.authorId)
        await pushNotification({
          userId,
          type: 'mention',
          title: `u/${actorUsername} mentioned you in "${postTitle.slice(0, 48)}"`,
          body: preview || undefined,
          href,
          actorId: input.authorId,
          sendEmail: emailAllowed,
          emailKind: 'mention',
          actorUsername,
          postTitle,
        })
      })
    )
  } catch (err) {
    console.error('[community/notify] mentions failed:', err)
  }
}

export type HiddenContentKind = 'post' | 'comment' | 'note' | 'question' | 'answer'

const HIDDEN_LABEL: Record<HiddenContentKind, string> = {
  post: 'post',
  comment: 'comment',
  note: 'note',
  question: 'question',
  answer: 'answer',
}

/**
 * In-app only: tell an author their content was hidden pending review.
 *
 * Auto-hiding on reports used to be silent — the author saw their post
 * vanish with no explanation and no way to know it was under review rather
 * than deleted. One notice per target: a second batch of reports on content
 * that is already hidden adds nothing.
 */
export async function notifyContentHidden(input: {
  authorId: string
  kind: HiddenContentKind
  targetId: string
  href: string
  title?: string | null
}): Promise<void> {
  try {
    const admin = createServiceClient()
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.authorId)
      .eq('type', 'moderation')
      .eq('body', input.targetId)
    if ((count ?? 0) > 0) return

    const label = HIDDEN_LABEL[input.kind]
    const what = input.title?.trim() ? `"${input.title.trim().slice(0, 48)}"` : `your ${label}`
    await pushNotification({
      userId: input.authorId,
      type: 'moderation',
      title: `${what} was hidden pending review`,
      // The target id doubles as the once-only key above.
      body: input.targetId,
      href: input.href,
      sendEmail: false,
    })
  } catch (err) {
    console.error('[community/notify] hidden-content notice failed:', err)
  }
}
