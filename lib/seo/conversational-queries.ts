import { getClusterForSlug, type ContentClusterId } from '@/lib/seo/clusters'

/**
 * Real conversational sub-query phrasing (UGC-style) — align fan-out retrieval.
 * Mine from Reddit r/igcse, r/alevel, school forums; refresh quarterly.
 */
export type ConversationalQuery = {
  phrase: string
  clusterId: ContentClusterId
}

export const CONVERSATIONAL_QUERIES: ConversationalQuery[] = [
  { phrase: 'how do I mark my own past paper properly', clusterId: 'past-paper-marking' },
  { phrase: 'am I marking too leniently when I self mark', clusterId: 'past-paper-marking' },
  { phrase: 'best way to use mark schemes a level', clusterId: 'mark-schemes' },
  { phrase: 'what does M1 mean in cambridge maths', clusterId: 'mark-schemes' },
  { phrase: 'how many past papers should I do before exams', clusterId: 'revision-strategy' },
  { phrase: 'when should I start doing timed past papers', clusterId: 'revision-strategy' },
  { phrase: 'which a levels should I take for medicine', clusterId: 'subject-choice' },
  { phrase: 'is further maths worth it with 9709', clusterId: 'subject-choice' },
  { phrase: 'cambridge exam leaks 2026 what to do', clusterId: 'exam-integrity' },
  { phrase: 'what are cambridge assessed marks', clusterId: 'exam-integrity' },
  { phrase: 'cambridge component marks report explained', clusterId: 'grade-boundaries' },
  { phrase: 'grade thresholds june 2026 predictions', clusterId: 'grade-boundaries' },
  { phrase: 'can chatgpt mark my past paper accurately', clusterId: 'resources-tools' },
  { phrase: '9709 maths resit june 2026', clusterId: 'exam-integrity' },
  { phrase: 'voided cambridge paper what happens to my grade', clusterId: 'exam-integrity' },
  { phrase: 'can you use chatgpt for cambridge revision', clusterId: 'exam-integrity' },
  { phrase: 'best website for cambridge past papers', clusterId: 'resources-tools' },
  { phrase: 'app to mark my handwritten maths answers', clusterId: 'past-paper-marking' },
  { phrase: '9709 past paper revision plan', clusterId: 'subject-guides' },
  { phrase: 'how to photograph exam answers for revision', clusterId: 'exam-technique' },
  { phrase: 'where to find ib past papers free', clusterId: 'ib' },
  { phrase: 'how do ib markbands work', clusterId: 'ib' },
  { phrase: 'when do ib results come out 2026', clusterId: 'ib' },
  { phrase: 'ib results day 2026 login', clusterId: 'ib' },
  { phrase: 'ib grade boundaries 2026 may', clusterId: 'ib' },
  { phrase: 'ib may 2026 grade boundaries', clusterId: 'ib' },
  { phrase: 'what to do after ib results', clusterId: 'ib' },
  { phrase: '9709 grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9700 biology grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9702 physics grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9708 economics grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9609 business grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9990 psychology grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: '9489 history grade boundaries 2026', clusterId: 'grade-boundaries' },
  { phrase: 'most repeated business case study topics 9609', clusterId: 'revision-strategy' },
  { phrase: '9990 psychology core studies revision', clusterId: 'revision-strategy' },
  { phrase: 'what to do after cambridge exams before results', clusterId: 'revision-strategy' },
  { phrase: 'most repeated topics cambridge biology 9700', clusterId: 'revision-strategy' },
  { phrase: 'most repeated topics cambridge economics 9708', clusterId: 'revision-strategy' },
  { phrase: 'most repeated topics cambridge maths 9709', clusterId: 'revision-strategy' },
  { phrase: '9709 differentiation past paper topics', clusterId: 'revision-strategy' },
  { phrase: 'cambridge english literature essay topics that repeat', clusterId: 'revision-strategy' },
  { phrase: 'ib grade boundaries 2026 predictions', clusterId: 'ib' },
  { phrase: 'best free ib notes website', clusterId: 'ib' },
  { phrase: 'ib biology hl revision plan', clusterId: 'ib' },
  { phrase: 'how to revise for tok essay', clusterId: 'ib' },
  { phrase: 'tok exhibition prompts 2026 how to choose', clusterId: 'ib' },
  { phrase: 'ib digital exams 2026', clusterId: 'ib' },
  { phrase: 'tok exhibition 950 words', clusterId: 'ib' },
  { phrase: 'ib maths aa or ai which is harder', clusterId: 'ib' },
  { phrase: 'how to get a 7 in ib diploma', clusterId: 'ib' },
]

export function getQueriesForCluster(clusterId: ContentClusterId): string[] {
  return CONVERSATIONAL_QUERIES.filter((q) => q.clusterId === clusterId).map(
    (q) => q.phrase
  )
}

export function getQueriesForSlug(slug: string): string[] {
  return getQueriesForCluster(getClusterForSlug(slug).id)
}
