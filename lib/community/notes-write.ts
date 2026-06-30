import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent } from '@/lib/community/sanitize'
import type { Board } from '@/lib/community/notes-types'

export type CreateNoteInput = {
  authorId: string
  board: Board
  subjectCode: string
  topicCode?: string | null
  lessonSlug?: string | null
  questionId?: string | null
  title: string
  contentMd: string
  imagePaths?: string[]
  subjectName?: string
}

export type CreateNoteResult =
  | { ok: true; id: string; status: string; reason?: string }
  | { ok: false; error: string }

/** Validate → Gemini screen → insert. Returns published or needs_edit per the gate. */
export async function createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
  const title = (input.title || '').trim().slice(0, 140)
  const content = clampNoteContent((input.contentMd || '').trim())
  if (title.length < 4) return { ok: false, error: 'Give your note a title (at least 4 characters).' }
  if (content.length < 20) return { ok: false, error: 'Add a bit more detail (at least 20 characters).' }

  const { screenContribution } = await import('@/lib/community/ai-screen')
  const verdict = await screenContribution({
    kind: 'note',
    title,
    body: content,
    subject: input.subjectName || input.subjectCode,
  })
  const status = verdict.ok ? 'published' : 'needs_edit'

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('community_notes')
    .insert({
      author_id: input.authorId,
      board: input.board,
      subject_code: input.subjectCode,
      topic_code: input.topicCode ?? null,
      lesson_slug: input.lessonSlug ?? null,
      question_id: input.questionId ?? null,
      title,
      content_md: content,
      image_paths: input.imagePaths ?? [],
      status,
      moderation_reason: verdict.ok ? null : verdict.reason,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[community/notes] insert failed:', error)
    return { ok: false, error: 'Could not save your note. Please try again.' }
  }
  return { ok: true, id: data.id, status, reason: verdict.reason }
}
