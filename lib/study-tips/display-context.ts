import { getSyllabusTopicByCode as get9709Topic } from '@/lib/syllabus'
import { getSyllabusTopicByCode, getSyllabusSubjectName } from '@/lib/syllabi'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { getStudyTip, pickPrimarySyllabusTag } from './curated'

export type MarkingDisplayContext = {
  paperLine: string | null
  topicLine: string | null
  tipLine: string | null
  primaryTag: string | null
}

function topicName(subjectCode: string, tag: string): string | null {
  if (subjectCode === '9709') {
    return get9709Topic(tag)?.name ?? null
  }
  return getSyllabusTopicByCode(subjectCode, tag)?.name ?? null
}

export function formatPaperReference(
  paperCode: string | null | undefined,
  paperSession: string | null | undefined,
  questionNumber: string | null | undefined
): string | null {
  if (!paperCode?.trim()) return null
  const subjectCode = paperCode.split('/')[0]
  const subjectName = getSyllabusSubjectName(subjectCode) || subjectCode
  const session = paperSession?.trim() ? ` · ${paperSession.trim()}` : ''
  const q = questionNumber?.trim() ? ` · Question ${questionNumber.trim()}` : ''
  const board = isIbSubjectCode(subjectCode) ? 'IB' : 'Cambridge'
  return `${board} ${paperCode} (${subjectName})${q}${session}`
}

export function buildMarkingDisplayContext(params: {
  paper_code?: string | null
  paper_session?: string | null
  question_number?: string | null
  syllabus_tags?: string[] | null
}): MarkingDisplayContext {
  const paperCode = params.paper_code?.trim() || null
  const subjectCode = paperCode?.split('/')[0] ?? null
  const tags = params.syllabus_tags?.filter(Boolean) ?? []
  const primaryTag =
    subjectCode && tags.length
      ? pickPrimarySyllabusTag(subjectCode, tags)
      : null

  const paperLine = formatPaperReference(
    paperCode,
    params.paper_session,
    params.question_number
  )

  let topicLine: string | null = null
  let tipLine: string | null = null

  if (subjectCode && primaryTag) {
    const name = topicName(subjectCode, primaryTag)
    topicLine = name
      ? `${primaryTag} — ${name}`
      : primaryTag
    tipLine = getStudyTip(subjectCode, primaryTag)
  }

  return {
    paperLine,
    topicLine,
    tipLine,
    primaryTag,
  }
}
