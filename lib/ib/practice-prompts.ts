import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { getIbMarkingProfile } from '@/lib/ib/marking-config'

/** Practice question stub when deep-linking from an IB course lesson to /mark. */
export function buildIbTopicPracticePrompt(
  subjectCode: string,
  topicCode: string
): string {
  const topic = getSyllabusTopicByCode(subjectCode, topicCode)
  const profile = getIbMarkingProfile(subjectCode)
  const topicName = topic?.name ?? topicCode
  const component = topic?.paper ?? 'Assessment'

  if (!profile) {
    return `IB practice — ${topicName}\n\nPaste or upload your response for feedback on: ${topicName}.`
  }

  const criteriaHint = profile.criteria?.length
    ? `Marked against: ${profile.criteria.map((c) => `${c.id} ${c.name} (/${c.maxMarks})`).join('; ')}.`
    : profile.markingBlurb

  return `${profile.name} — ${component}: ${topicName}

Submit your work on "${topicName}" for IB criterion-based examiner feedback.

${criteriaHint}

Paste your response below (essay extract, exhibition commentary, comparative analysis, reflection, etc.) or upload a photo of handwritten work.`
}

export function ibPracticeCriteriaSummary(subjectCode: string): string | null {
  const profile = getIbMarkingProfile(subjectCode)
  if (!profile?.criteria?.length) return profile?.markingBlurb ?? null
  return profile.criteria.map((c) => `${c.id}: ${c.name}`).join(' · ')
}
