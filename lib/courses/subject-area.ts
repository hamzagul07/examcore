/** Topic-group tags for subject-aware symbol definitions (e.g. T = period vs temperature). */
export type SubjectArea = 'thermal' | 'waves' | 'mechanics' | 'electricity' | 'default'

/** Map Cambridge topic code (e.g. "14.2") to a subject area. */
export function subjectAreaFromTopicCode(topicCode: string): SubjectArea {
  const major = Number.parseInt(topicCode.split('.')[0] ?? '', 10)
  if (Number.isNaN(major)) return 'default'
  if (major >= 1 && major <= 6) return 'mechanics'
  if (major >= 7 && major <= 9) return 'waves'
  if (major >= 10 && major <= 11) return 'electricity'
  if (major >= 14 && major <= 17) return 'thermal'
  return 'default'
}
