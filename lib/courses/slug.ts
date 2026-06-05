/** Stable URL slug for a syllabus leaf lesson. */
export function topicToLessonSlug(topicCode: string, topicName: string): string {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const codePart = topicCode.replace(/\./g, '-')
  return `${codePart}-${namePart}`
}

export function lessonSlugToTopicCode(slug: string): string | null {
  const match = slug.match(/^(\d+(?:-\d+)*)/)
  if (!match) return null
  return match[1].replace(/-/g, '.')
}
