import { SITE_URL } from '@/lib/site-config'
import { howToNode } from '@/lib/seo/structured-data'

export const MARKING_HOW_TO = {
  name: 'How to use MarkScheme for second-pass past-paper marking',
  description:
    'Self-mark strictly with the official mark scheme or IB markbands, then upload the same handwritten script to MarkScheme for scheme-aligned feedback.',
  steps: [
    {
      name: 'Attempt under exam conditions',
      text: 'Complete the question or paper timed, with handwritten answers as in the real exam.',
    },
    {
      name: 'Self-mark strictly',
      text: 'Mark against the official PDF mark scheme or markband column. Log every lost mark ÿ do not give yourself the benefit of the doubt.',
    },
    {
      name: 'Upload to MarkScheme',
      text: 'Photograph or upload your script at markscheme.app/mark. Select Cambridge or IB, subject, and paper.',
    },
    {
      name: 'Review scheme-aligned feedback',
      text: 'Read B1/M1/A1 or markband feedback, redo one weak skill, then attempt the next paper.',
    },
  ],
} as const

export function markingHowToJsonLd() {
  return howToNode({
    name: MARKING_HOW_TO.name,
    description: MARKING_HOW_TO.description,
    url: `${SITE_URL}/mark`,
    steps: [...MARKING_HOW_TO.steps],
  })
}
