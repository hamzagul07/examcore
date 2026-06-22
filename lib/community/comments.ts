import { createServiceClient } from '@/lib/supabase-server'
import { screenContribution } from '@/lib/community/ai-screen'
import { clampNoteContent, stripRawHtml } from '@/lib/community/sanitize'

export type CommunityComment = {
  id: string
  postId: string
  parentId: string | null
  authorId: string
  authorUsername: string | null
  bodyMd: string
  upvotes: number
  downvotes: number
  score: number
  depth: number
  status: string
  createdAt: string
}

/** A comment with its nested replies (tree node). */
export type CommentNode = CommunityComment & { replies: CommentNode[] }

type Row = {
  id: string
  post_id: string
  parent_id: string | null
  author_id: string
  body_md: string
  upvotes: number
  downvotes: number
  score: number
  depth: number
  status: string
  created_at: string
}

type Admin = ReturnType<typeof createServiceClient>

function mapRow(r: Row, username: string | null): CommunityComment {
  return {
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    authorId: r.author_id,
    authorUsername: username,
    bodyMd: r.body_md,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    score: r.score,
    depth: r.depth,
    status: r.status,
    createdAt: r.created_at,
  }
}

async function usernameMap(admin: Admin, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username')
    .in('id', [...new Set(ids)])
  return new Map<string, string | null>((data ?? []).map((p) => [p.id, p.username]))
}

/** Load all comments for a post and assemble a sorted tree (top score first). */
export async function getCommentTree(postId: string): Promise<CommentNode[]> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_comments')
    .select('id, post_id, parent_id, author_id, body_md, upvotes, downvotes, score, depth, status, created_at')
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
  const rows = (data ?? []) as Row[]
  const names = await usernameMap(admin, rows.map((r) => r.author_id))

  const nodes = new Map<string, CommentNode>()
  rows.forEach((r) => nodes.set(r.id, { ...mapRow(r, names.get(r.author_id) ?? null), replies: [] }))

  const roots: CommentNode[] = []
  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export type CreateCommentInput = {
  postId: string
  parentId?: string | null
  authorId: string
  bodyMd: string
  subjectName?: string
}

export type CreateCommentResult =
  | { ok: true; id: string; status: string }
  | { ok: false; error: string }

export async function createComment(input: CreateCommentInput): Promise<CreateCommentResult> {
  const body = clampNoteContent(stripRawHtml(input.bodyMd ?? ''), 8000).trim()
  if (body.length < 1) return { ok: false, error: 'Write a comment first.' }

  const admin = createServiceClient()

  // Reject if post is locked.
  const { data: post } = await admin
    .from('community_posts')
    .select('is_locked, subject_code')
    .eq('id', input.postId)
    .maybeSingle()
  if (!post) return { ok: false, error: 'Post not found.' }
  if (post.is_locked) return { ok: false, error: 'This thread is locked.' }

  let depth = 0
  if (input.parentId) {
    const { data: parent } = await admin
      .from('community_comments')
      .select('depth, post_id')
      .eq('id', input.parentId)
      .maybeSingle()
    if (!parent || parent.post_id !== input.postId) {
      return { ok: false, error: 'Parent comment not found.' }
    }
    depth = Math.min((parent.depth as number) + 1, 8)
  }

  const verdict = await screenContribution({
    kind: 'answer',
    body,
    subject: input.subjectName ?? (post.subject_code as string),
  })
  const status = verdict.ok ? 'published' : 'flagged'

  const { data, error } = await admin
    .from('community_comments')
    .insert({
      post_id: input.postId,
      parent_id: input.parentId ?? null,
      author_id: input.authorId,
      body_md: body,
      depth,
      status,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: 'Could not post your comment.' }

  await admin
    .from('community_comment_votes')
    .insert({ comment_id: data.id, user_id: input.authorId, value: 1 })

  // Notify the post author of a new top-level comment.
  if (!input.parentId) {
    const { data: p } = await admin
      .from('community_posts')
      .select('author_id, title')
      .eq('id', input.postId)
      .maybeSingle()
    if (p && p.author_id !== input.authorId) {
      try {
        await admin.from('notifications').insert({
          user_id: p.author_id,
          type: 'comment',
          title: `New comment on "${(p.title as string).slice(0, 60)}"`,
          href: `/community/posts/${input.postId}`,
        })
      } catch {
        // Notifications are best-effort — never fail a comment over them.
      }
    }
  }

  return { ok: true, id: data.id, status }
}

export async function voteComment(commentId: string, userId: string, value: -1 | 1): Promise<number> {
  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('community_comment_votes')
    .select('value')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing?.value === value) {
    await admin.from('community_comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId)
    return 0
  }
  await admin
    .from('community_comment_votes')
    .upsert({ comment_id: commentId, user_id: userId, value }, { onConflict: 'comment_id,user_id' })
  return value
}

export async function getUserCommentVotes(
  userId: string,
  commentIds: string[]
): Promise<Record<string, number>> {
  if (!commentIds.length) return {}
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_comment_votes')
    .select('comment_id, value')
    .eq('user_id', userId)
    .in('comment_id', commentIds)
  const out: Record<string, number> = {}
  for (const row of data ?? []) out[row.comment_id as string] = row.value as number
  return out
}

/** Flatten a comment tree to collect all ids (for vote lookups). */
export function collectCommentIds(nodes: CommentNode[]): string[] {
  const ids: string[] = []
  const walk = (list: CommentNode[]) => {
    for (const n of list) {
      ids.push(n.id)
      if (n.replies.length) walk(n.replies)
    }
  }
  walk(nodes)
  return ids
}
