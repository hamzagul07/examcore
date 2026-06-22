import { createServiceClient } from '@/lib/supabase-server'
import { screenContribution } from '@/lib/community/ai-screen'

/** Run AI moderation after a post is already visible — flags if needed. */
export async function moderatePostAfterInsert(
  postId: string,
  input: {
    kind: 'note' | 'question'
    title: string
    body: string
    subject: string
  }
): Promise<void> {
  try {
    const verdict = await screenContribution({
      kind: input.kind,
      title: input.title,
      body: input.body,
      subject: input.subject,
    })
    if (verdict.ok) return

    const admin = createServiceClient()
    await admin
      .from('community_posts')
      .update({
        status: 'needs_edit',
        moderation_reason:
          verdict.reason ??
          'This post was held for review — please keep it on-topic and respectful.',
      })
      .eq('id', postId)
      .eq('status', 'published')
  } catch (err) {
    console.error('[community/moderate-async] post moderation failed:', err)
  }
}

/** Run AI moderation after a comment is already visible — flags if needed. */
export async function moderateCommentAfterInsert(
  commentId: string,
  input: { body: string; subject: string }
): Promise<void> {
  try {
    const verdict = await screenContribution({
      kind: 'answer',
      body: input.body,
      subject: input.subject,
    })
    if (verdict.ok) return

    const admin = createServiceClient()
    await admin
      .from('community_comments')
      .update({ status: 'flagged' })
      .eq('id', commentId)
      .eq('status', 'published')
  } catch (err) {
    console.error('[community/moderate-async] comment moderation failed:', err)
  }
}

/** Best-effort notification — never blocks the comment response. */
export async function notifyPostAuthorOfComment(
  postId: string,
  commentAuthorId: string
): Promise<void> {
  try {
    const admin = createServiceClient()
    const { data: p } = await admin
      .from('community_posts')
      .select('author_id, title')
      .eq('id', postId)
      .maybeSingle()
    if (!p || p.author_id === commentAuthorId) return

    await admin.from('notifications').insert({
      user_id: p.author_id,
      type: 'comment',
      title: `New comment on "${(p.title as string).slice(0, 60)}"`,
      href: `/community/posts/${postId}`,
    })
  } catch {
    // Notifications are best-effort.
  }
}
