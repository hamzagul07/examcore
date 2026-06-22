import { createServiceClient } from '@/lib/supabase-server'
import { screenContribution } from '@/lib/community/ai-screen'
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
