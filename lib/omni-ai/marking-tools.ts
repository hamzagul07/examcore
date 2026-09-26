import type { FunctionDeclaration } from '@google/genai'

/**
 * Two-step lookup so the model pulls one attempt's full marking only when it
 * needs it. The listing used to return the full payload for up to ten
 * attempts per call — see lib/omni-ai/tool-budget.ts for why that had to go.
 */
export const FETCH_RECENT_ATTEMPTS_TOOL: FunctionDeclaration = {
  name: 'fetch_recent_attempts',
  description:
    "List the current student's recent marked attempts as short excerpts (id, paper, score, date, syllabus tags, the first 300 characters of the question and a 400-character summary of the marking). Use it to find WHICH attempt the student means or to see their trend across attempts. It does not include per-mark reasoning — call fetch_attempt_detail with an id from this list when you need to explain specific marks.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      subject_code: {
        type: 'string',
        description: 'Filter by subject code (e.g. "9706"). Optional.',
      },
      topic_code: {
        type: 'string',
        description: 'Filter by syllabus topic. Optional.',
      },
      limit: {
        type: 'number',
        description: 'Max attempts to return, up to 10. Default 5.',
      },
    },
  },
}

export const FETCH_ATTEMPT_DETAIL_TOOL: FunctionDeclaration = {
  name: 'fetch_attempt_detail',
  description:
    "Fetch ONE of the student's marked attempts in full: question text, their transcribed answer, the mark scheme excerpt and every mark awarded or withheld with the examiner's reasoning. Use the id from fetch_recent_attempts or from the focused attempt. Fetch only the attempt you need — each call is expensive.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      attempt_id: {
        type: 'string',
        description: 'The attempt id to load.',
      },
    },
    required: ['attempt_id'],
  },
}

export const OMNI_MARKING_TOOLS: FunctionDeclaration[] = [
  FETCH_RECENT_ATTEMPTS_TOOL,
  FETCH_ATTEMPT_DETAIL_TOOL,
]
