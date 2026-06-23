import type { IbCriterion, IbMarkingProfile } from '@/lib/ib/marking-config'
import type { MarkSchemeRow, MarkingStyle } from '@/lib/marking/types'

const IB_BOARD = 'IB Diploma'

function criteriaToMarkSchemeJson(criteria: IbCriterion[]): Record<string, unknown> {
  return {
    type: 'level_of_response',
    assessment: 'criterion',
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      max_marks: c.maxMarks,
      bands: c.bands.map((b) => ({
        level: b.level,
        descriptor: b.descriptor,
      })),
    })),
  }
}

/** Synthetic IB practice mark scheme when no official row exists in the database. */
export function buildIbPracticeMarkScheme(
  profile: IbMarkingProfile,
  questionText: string
): MarkSchemeRow {
  const style: MarkingStyle = profile.practiceStyle
  const total = profile.practiceMaxMarks
  const ms = profile.criteria?.length
    ? criteriaToMarkSchemeJson(profile.criteria)
    : {
        type: style,
        bands: [
          { level: 0, marks: '0', descriptor: 'Does not reach standard.' },
          { level: 1, marks: '1-2', descriptor: 'Limited response.' },
          { level: 2, marks: '3-4', descriptor: 'Some relevant points.' },
          { level: 3, marks: '5-6', descriptor: 'Adequate response.' },
          { level: 4, marks: '7-8', descriptor: 'Good response with analysis.' },
          { level: 5, marks: '9-10', descriptor: 'Excellent, sustained analysis.' },
        ],
      }

  return {
    id: `practice-${profile.code}`,
    board: IB_BOARD,
    subject: profile.name,
    paper_code: `${profile.code}/00`,
    paper_session: 'Practice',
    question_number: '1',
    question_text: questionText || `[${profile.name} practice response]`,
    total_marks: total,
    mark_scheme: ms,
    marking_type: style,
    syllabus_tags: null,
  }
}
