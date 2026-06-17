import type { CourseFaqItem, CourseLesson } from '@/lib/courses/types'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'
import { buildSubjectCourseSeo } from '@/lib/seo/subject-seo'
export type CourseSeoContext = {
  code: string
  name: string
  level: string
}

export type CourseLessonSeo = {
  title: string
  description: string
  keywords: string[]
  introHeading: string
  introParagraph: string
  breadcrumbs: { name: string; path: string }[]
  faqs: CourseFaqItem[]
  markPath: string
}

function subjectShort(name: string): string {
  if (name === 'Mathematics') return 'Maths'
  if (name === 'Biology') return 'Biology'
  if (name === 'Physics') return 'Physics'
  return name.split(' ')[0] ?? name
}

function levelPhrase(level: string): string {
  if (level === 'A-Level') return 'A-Level'
  if (level.includes('IGCSE') || level.includes('O-Level')) return 'O-Level'
  return level
}

/** Search-intent keywords students use on Google (UK + international). */
export function buildCourseLessonKeywords(
  course: CourseSeoContext,
  lesson: CourseLesson
): string[] {
  const { code, name, level } = course
  const short = subjectShort(name)
  const lp = levelPhrase(level)
  const t = lesson.title
  const tc = lesson.topicCode

  const base = [
    `${code} ${t} notes`,
    `${code} ${t} revision`,
    `${t} ${code} Cambridge`,
    `Cambridge ${lp} ${name} ${t}`,
    `Cambridge ${short} ${t} notes`,
    `${lp} ${short} ${t} revision`,
    `${code} syllabus ${tc}`,
    `${tc} ${name} ${code}`,
    `free ${t} notes ${code}`,
    `free Cambridge ${code} course`,
    `${t} past paper ${code}`,
    `${t} explained ${lp}`,
    `how to revise ${t} ${code}`,
    `${code} ${t} exam questions`,
    `ZNotes ${code} alternative`,
    `Save My Exams ${t} free`,
    `${short} ${t} mark scheme`,
    `Cambridge International ${code} ${t}`,
    `${lesson.paper} ${t} ${code}`,
    `${t} revision guide free`,
    `MarkScheme ${code} ${t}`,
  ]

  if (lesson.learningObjectives?.length) {
    for (const obj of lesson.learningObjectives.slice(0, 2)) {
      const words = obj.split(/\s+/).slice(0, 5).join(' ')
      if (words.length > 12) base.push(`${code} ${words}`)
    }
  }

  return [...new Set(base.map((k) => k.toLowerCase().replace(/\s+/g, ' ').trim()))]
}

export function buildCourseLessonDescription(
  course: CourseSeoContext,
  lesson: CourseLesson
): string {
  const { code, name, level } = course
  const lp = levelPhrase(level)
  const isPremium = lesson.status === 'premium' || lesson.status === 'published'

  const core = isPremium
    ? `Free Cambridge ${lp} ${name} (${code}) lesson on ${lesson.title} — syllabus ${lesson.topicCode}. Visual revision, exam tips, worked examples & past-paper marking.`
    : `Free Cambridge ${lp} ${name} (${code}) topic ${lesson.title} (${lesson.topicCode}). Syllabus-aligned outline, exam tips & past-paper practice with mark-scheme marking.`

  return formatMetaDescription(core)
}

export function buildCourseLessonTitle(
  course: CourseSeoContext,
  lesson: CourseLesson
): string {
  const short = subjectShort(course.name)
  const lp = levelPhrase(course.level)
  // Primary keyword first: topic + code (what students search)
  const raw = `${lesson.title} ${course.code} — Free ${lp} ${short}`
  return formatSerpTitle(raw, true)
}

export function buildCourseLessonFaqs(
  course: CourseSeoContext,
  lesson: CourseLesson
): CourseFaqItem[] {
  const { code, name, level } = course
  const lp = levelPhrase(level)
  const path = `/courses/${code}/${lesson.slug}`

  const generated: CourseFaqItem[] = [
    {
      q: `Where can I learn ${lesson.title} for Cambridge ${code}?`,
      a: `This free lesson on MarkScheme covers syllabus point ${lesson.topicCode} (${lesson.title}) for Cambridge ${lp} ${name}. It includes visual revision, key points, and links to real past-paper questions with mark-scheme marking at markscheme.app${path}.`,
    },
    {
      q: `Is ${lesson.title} (${lesson.topicCode}) on ${code} free to study?`,
      a: `Yes. The ${name} ${code} course on MarkScheme is 100% free — including premium visual lessons, exam tips, and past-paper marking. No paywall for ${lesson.title}.`,
    },
    {
      q: `How do I revise ${lesson.title} for ${code} exams?`,
      a: `Start with the visual steps on this page, note the key exam points, then attempt a ${code} past-paper question on ${lesson.title} using MarkScheme's /mark tool. Mark strictly against the official scheme and re-read any marks you lost.`,
    },
    {
      q: `What past papers test ${lesson.title} (${lesson.topicCode})?`,
      a: `${lesson.title} appears on ${lesson.paperName} for syllabus ${lesson.topicCode}. Use the Practice tab on this lesson for real Cambridge questions from our library, or browse ${code} papers on /subjects/${code}.`,
    },
    {
      q: `How is this ${lesson.title} lesson different from ZNotes or Save My Exams?`,
      a: `MarkScheme teaches ${lesson.topicCode} with interactive visual revision, simpler explanations, worked examples, and built-in past-paper marking against real Cambridge mark schemes — not static PDF notes alone.`,
    },
  ]

  const existing = lesson.faq ?? []
  const seen = new Set<string>()
  const merged: CourseFaqItem[] = []

  for (const item of [...existing, ...generated]) {
    const key = item.q.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged.slice(0, 6)
}

export function buildCourseLessonIntro(
  course: CourseSeoContext,
  lesson: CourseLesson
): { heading: string; paragraph: string } {
  const { code, name, level } = course
  const lp = levelPhrase(level)
  const isPremium = lesson.status === 'premium' || lesson.status === 'published'

  const heading = `Revise ${lesson.title} for Cambridge ${code} (${lesson.topicCode})`

  const paragraph = isPremium
    ? `Looking for **free ${name} ${code} notes** on **${lesson.title}**? This ${lp} lesson covers official syllabus point **${lesson.topicCode}** on ${lesson.paperName}. Use the visual steps, key terms, and quick checks below — then practise a real **${code} past-paper question** with mark-scheme marking. Built for students searching "${lesson.title} ${code} revision", "${code} ${lesson.topicCode} notes", or a free alternative to paid note sites.`
    : `Free **${name} (${code})** revision outline for **${lesson.title}** — syllabus **${lesson.topicCode}** on ${lesson.paperName}. Full premium lesson publishing soon; you can still learn the topic structure, use simpler explanations, and **practise past-paper marking** on ${lesson.title} today.`

  return { heading, paragraph }
}

export function buildCourseLessonSeo(
  course: CourseSeoContext,
  lesson: CourseLesson
): CourseLessonSeo {
  const intro = buildCourseLessonIntro(course, lesson)
  return {
    title: buildCourseLessonTitle(course, lesson),
    description: buildCourseLessonDescription(course, lesson),
    keywords: buildCourseLessonKeywords(course, lesson),
    introHeading: intro.heading,
    introParagraph: intro.paragraph,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Free courses', path: '/courses' },
      { name: `${course.name} ${course.code}`, path: `/courses/${course.code}` },
      { name: lesson.title, path: `/courses/${course.code}/${lesson.slug}` },
    ],
    faqs: buildCourseLessonFaqs(course, lesson),
    markPath: `/mark?subject=${course.code}&topic=${encodeURIComponent(lesson.topicCode)}`,
  }
}

export function buildCourseSubjectSeo(course: CourseSeoContext, lessonCount: number): {
  title: string
  description: string
  keywords: string[]
  tagline: string
  topics: string[]
  ogImagePath: string
} {
  return buildSubjectCourseSeo(course, lessonCount)
}
export function lessonLastModified(lesson: CourseLesson): Date | undefined {
  if (lesson.updated) {
    const d = new Date(lesson.updated)
    if (!Number.isNaN(d.getTime())) return d
  }
  return undefined
}
