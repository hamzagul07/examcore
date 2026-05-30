import type Anthropic from '@anthropic-ai/sdk'

export const FETCH_RECENT_ATTEMPTS_TOOL: Anthropic.Tool = {
  name: 'fetch_recent_attempts',
  description:
    "Fetch the current user's recent marked attempts. Use when the student asks about a past question, why they lost marks, their progress on a topic, or wants to compare attempts. Returns up to 10 most recent attempts with full marking details.",
  input_schema: {
    type: 'object' as const,
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

export const OMNI_MARKING_TOOLS: Anthropic.Tool[] = [FETCH_RECENT_ATTEMPTS_TOOL]
