import type { Board } from '@/lib/community/notes-types'

export type Question = {
  id: string
  authorId: string
  authorUsername: string | null
  board: Board
  subjectCode: string
  topicCode: string | null
  lessonSlug: string | null
  questionId: string | null
  title: string
  bodyMd: string
  status: string
  answerCount: number
  voteCount: number
  acceptedAnswerId: string | null
  createdAt: string
}

export type Answer = {
  id: string
  questionId: string
  authorId: string
  authorUsername: string | null
  bodyMd: string
  voteCount: number
  isAccepted: boolean
  createdAt: string
}

export type CreateResult =
  | { ok: true; id: string; status: string; reason?: string }
  | { ok: false; error: string }
