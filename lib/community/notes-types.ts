export type Board = 'cambridge' | 'ib'

export type CommunityNote = {
  id: string
  authorId: string
  authorUsername: string | null
  board: Board
  subjectCode: string
  topicCode: string | null
  lessonSlug: string | null
  questionId: string | null
  title: string
  contentMd: string
  imagePaths: string[]
  status: string
  upvoteCount: number
  saveCount: number
  createdAt: string
}

export type NoteRow = {
  id: string
  author_id: string
  board: Board
  subject_code: string
  topic_code: string | null
  lesson_slug: string | null
  title: string
  content_md: string
  image_paths: string[] | null
  status: string
  upvote_count: number
  save_count: number
  created_at: string
  question_id?: string | null
}
