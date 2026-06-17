import type { CourseSeoContext } from '@/lib/courses/seo'
import type { SubjectOption } from '@/lib/profile-options'
import { getSubjectSeoProfile } from '@/lib/seo/subject-seo'

export type HubSeoIntro = {
  heading: string
  paragraph: string
}

export function buildSubjectHubIntro(subject: SubjectOption): HubSeoIntro {
  const profile = getSubjectSeoProfile(subject.code)
  const level = subject.levels.includes('O-Level') ? 'O-Level' : 'A-Level'
  const marking =
    subject.markingType === 'level_of_response'
      ? 'essay band marking'
      : subject.markingType === 'mixed'
        ? 'mixed point and essay-band marking'
        : 'B1/M1/A1 point marking'

  if (profile) {
    return {
      heading: `Cambridge ${profile.name} (${subject.code}) past paper marking`,
      paragraph: `${profile.markingDescription} MarkScheme applies real Cambridge mark schemes to your handwriting — ${marking} for ${level} ${profile.name}. Upload a photo from any ${subject.code} past paper and get feedback in seconds, or browse our paper library below.`,
    }
  }

  return {
    heading: `Cambridge ${subject.label} (${subject.code}) past paper marking`,
    paragraph: `Upload ${level} ${subject.label} answers for ${subject.code}. MarkScheme scores against official Cambridge mark schemes with ${marking}. Free to try — photograph your handwriting and see where marks were lost.`,
  }
}

export function buildCourseHubIntro(
  course: CourseSeoContext,
  lessonCount: number,
  publishedCount: number
): HubSeoIntro {
  const profile = getSubjectSeoProfile(course.code)
  const topicHint = profile?.topics.slice(0, 4).join(', ') ?? course.name

  if (profile) {
    return {
      heading: `Free ${course.name} ${course.code} course — ${lessonCount} syllabus topics`,
      paragraph: `Revise Cambridge ${course.level} ${course.name} (${course.code}) topic by topic. This free course covers ${lessonCount} official syllabus points${publishedCount > 0 ? ` including ${publishedCount} premium visual lessons` : ''} on ${topicHint}. Each topic links to real past-paper questions with mark-scheme marking — a free alternative to paid note sites.`,
    }
  }

  return {
    heading: `Free Cambridge ${course.name} (${course.code}) course`,
    paragraph: `Syllabus-aligned ${course.level} ${course.name} revision with ${lessonCount} topics, visual lessons, and built-in past-paper marking on MarkScheme.`,
  }
}
