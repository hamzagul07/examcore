/** How autonomous generation maps to student-facing publish gates. */
export type PublishPolicy = 'autonomous' | 'review_required'

/**
 * Technical/skills subjects: verify + spot-check, then promote.
 * Interpretive/sensitive subjects: generate autonomously but hold for human review before publish.
 */
export const SUBJECT_PUBLISH_POLICY: Record<string, PublishPolicy> = {
  '9706': 'autonomous',
  '9607': 'autonomous',
  '9488': 'review_required',
  '9489': 'review_required',
}

export function publishPolicyFor(subjectCode: string): PublishPolicy {
  return SUBJECT_PUBLISH_POLICY[subjectCode] ?? 'autonomous'
}

export function requiresHumanReviewBeforePublish(subjectCode: string): boolean {
  return publishPolicyFor(subjectCode) === 'review_required'
}
