import { createServiceClient } from '@/lib/supabase-server'
import type { Question } from '@/lib/community/qa'
import { listQuestions } from '@/lib/community/qa'
import { listNotes } from '@/lib/community/notes'
import { getUserMasterySignals } from '@/lib/community/mastery-signals'

export type FeedItem = {
  id: string
  kind: 'question' | 'note'
  title: string
  href: string
  meta: string
  anchor?: string
}

export type ExamRoomFeed = {
  yourSubjects: FeedItem[]
  youCanHelp: FeedItem[]
  mightHelpYou: FeedItem[]
  trendingNotes: FeedItem[]
}

function mapQuestion(q: Question): FeedItem {
  const anchor = q.topicCode ? `Topic ${q.topicCode}` : q.lessonSlug ? 'Lesson' : q.subjectCode
  return {
    id: q.id,
    kind: 'question',
    title: q.title,
    href: `/community/questions/${q.id}`,
    meta: `${q.answerCount} answers · ${q.voteCount} votes`,
    anchor,
  }
}

function matchesTopic(q: Question, topics: Set<string>) {
  return q.topicCode ? topics.has(q.topicCode) : false
}

export async function getPublicExamRoomFeed(): Promise<ExamRoomFeed> {
  const [questions, notes] = await Promise.all([
    listQuestions({ limit: 12 }),
    listNotes({ limit: 8 }),
  ])
  return {
    yourSubjects: questions.slice(0, 6).map(mapQuestion),
    youCanHelp: questions.filter((q) => q.answerCount === 0).slice(0, 6).map(mapQuestion),
    mightHelpYou: questions.filter((q) => q.answerCount > 0).slice(0, 6).map(mapQuestion),
    trendingNotes: notes.map((n) => ({
      id: n.id,
      kind: 'note' as const,
      title: n.title,
      href: `/community/notes/${n.id}`,
      meta: `${n.upvoteCount} upvotes · ${n.subjectCode}`,
      anchor: n.topicCode ? `Topic ${n.topicCode}` : n.subjectCode,
    })),
  }
}

export async function getPersonalizedExamRoomFeed(userId: string): Promise<ExamRoomFeed> {
  const signals = await getUserMasterySignals(userId)
  const subjectFilter = signals.subjects

  const [subjectQuestions, pool, notes] = await Promise.all([
    subjectFilter.length
      ? Promise.all(subjectFilter.map((code) => listQuestions({ subjectCode: code, limit: 12 }))).then(
          (r) => r.flat()
        )
      : listQuestions({ limit: 24 }),
    listQuestions({ limit: 40 }),
    listNotes({ limit: 8 }),
  ])

  const yourSubjects = (subjectFilter.length ? subjectQuestions : pool)
    .slice(0, 8)
    .map(mapQuestion)

  const unanswered = pool.filter((q) => q.answerCount === 0)
  const answered = pool.filter((q) => q.answerCount > 0)

  const masteryYouCanHelp = unanswered.filter((q) => matchesTopic(q, signals.examReadyTopics))
  const masteryMightHelp = answered.filter((q) => matchesTopic(q, signals.weakTopics))

  const youCanHelp = (masteryYouCanHelp.length ? masteryYouCanHelp : unanswered)
    .slice(0, 6)
    .map(mapQuestion)

  const mightHelpYou = (masteryMightHelp.length ? masteryMightHelp : answered)
    .slice(0, 6)
    .map(mapQuestion)

  return {
    yourSubjects,
    youCanHelp,
    mightHelpYou,
    trendingNotes: notes.map((n) => ({
      id: n.id,
      kind: 'note' as const,
      title: n.title,
      href: `/community/notes/${n.id}`,
      meta: `${n.upvoteCount} upvotes · ${n.subjectCode}`,
      anchor: n.topicCode ? `Topic ${n.topicCode}` : n.subjectCode,
    })),
  }
}

/** Award XP when a paper is marked (called from marking pipeline hook). */
export async function awardMarkingXp(userId: string, subjectCode: string | null, attemptId: string) {
  const { awardXp } = await import('@/lib/community/xp')
  await awardXp({
    userId,
    kind: 'paper_marked',
    subjectCode,
    points: 5,
    refId: attemptId,
  })
}
