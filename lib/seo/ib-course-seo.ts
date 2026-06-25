import type { CourseFaqItem, CourseLesson } from '@/lib/courses/types'
import type { IbSubject } from '@/lib/ib/catalog'
import { ibCourseLessonPath, ibCoursePath } from '@/lib/ib/slug-resolve'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'
import { ibShortName } from '@/lib/seo/ib-seo'

export type IbCourseSeoContext = {
  slug: string
  name: string
  level: string
}

export type IbCourseLessonSeo = {
  title: string
  description: string
  keywords: string[]
  introHeading: string
  introParagraph: string
  breadcrumbs: { name: string; path: string }[]
  faqs: CourseFaqItem[]
  markPath: string
}

function ibMarkCode(slug: string): string {
  return `ib-${slug}`
}

function levelPhrase(subject: IbSubject): string {
  if (subject.groupNumber === 7) return 'Core'
  return subject.level === 'HL' ? 'Higher Level' : 'Standard Level'
}

function levelShort(subject: IbSubject): string {
  if (subject.groupNumber === 7) return 'Core'
  return subject.level
}

export function buildIbCourseSubjectSeo(subject: IbSubject, lessonCount: number) {
  const short = ibShortName(subject)
  const lp = levelShort(subject)
  const title = formatSerpTitle(
    `Free IB ${short} ${lp} course — ${lessonCount} syllabus topics`,
    true
  )
  const description = formatMetaDescription(
    `Free IB Diploma ${subject.name} ${lp} course with ${lessonCount} topic-by-topic lessons. Worked examples, markband tips, flashcards and criterion-based practice marking — 100% free on MarkScheme.`
  )
  return {
    title,
    description,
    keywords: [
      `IB ${subject.name} ${lp}`,
      `IB ${short} notes`,
      `IB ${subject.name} course free`,
      `IB ${subject.name} revision`,
      `free IB ${short} course`,
      `IB ${subject.name} markbands`,
      `ZNotes IB ${short} alternative`,
      `RevisionDojo ${short} alternative`,
    ],
    tagline: `IB ${short} · ${lp} · Free course`,
    topics: [`IB ${subject.name}`, subject.group, ...subject.papers.slice(0, 3)],
    ogImagePath: '/ib/opengraph-image',
  }
}

export function buildIbCourseHubIntro(subject: IbSubject, lessonCount: number) {
  const short = ibShortName(subject)
  const lp = levelPhrase(subject)
  const isCore = subject.groupNumber === 7
  const marking =
    isCore || subject.groupNumber === 6
      ? 'criterion-based practice marking'
      : 'markband-aligned past-paper practice'

  return {
    heading: `Free IB ${subject.name} ${levelShort(subject)} course — ${lessonCount} topics`,
    paragraph: `Revise IB Diploma ${subject.name} (${lp}) topic by topic. This free course covers ${lessonCount} official syllabus points with visual lessons, worked examples, and ${marking}. Each topic links to IB criterion practice on MarkScheme — a free alternative to paid note sites for students searching "IB ${short} notes" or "IB ${subject.name} revision".`,
  }
}

export function buildIbCoursesIndexSeo(courseCount: number, lessonCount: number) {
  return {
    title: formatSerpTitle('Free IB Diploma courses — TOK, EE, sciences & arts', true),
    description: formatMetaDescription(
      `Browse ${courseCount} free IB Diploma courses with ${lessonCount}+ topic lessons. TOK, Extended Essay, CAS, sciences, maths, and Group 6 arts — criterion practice marking on every topic.`
    ),
    keywords: [
      'free IB course',
      'IB TOK course',
      'IB Extended Essay guide',
      'IB Biology SL notes',
      'IB Biology HL notes',
      'IB Diploma revision free',
      'IB criterion marking',
      'ZNotes IB alternative',
    ],
  }
}

export function buildIbCourseLessonKeywords(
  subject: IbSubject,
  lesson: CourseLesson
): string[] {
  const short = ibShortName(subject)
  const lp = levelShort(subject)
  const t = lesson.title
  const tc = lesson.topicCode

  const base = [
    `IB ${subject.name} ${t}`,
    `IB ${short} ${t} notes`,
    `${t} IB ${subject.name} ${lp}`,
    `IB ${subject.name} ${lp} ${t}`,
    `IB ${short} ${tc}`,
    `IB syllabus ${tc} ${short}`,
    `free IB ${t} notes`,
    `IB ${subject.name} revision ${t}`,
    `how to revise ${t} IB`,
    `IB ${subject.name} markbands ${t}`,
    `IB criterion practice ${short}`,
    `MarkScheme IB ${short} ${t}`,
    `ZNotes IB ${short} alternative`,
    `RevisionDojo ${short} free`,
    `IB ${subject.name} ${lesson.paper}`,
    `${t} IB exam tips`,
  ]

  if (lesson.learningObjectives?.length) {
    for (const obj of lesson.learningObjectives.slice(0, 2)) {
      const words = obj.split(/\s+/).slice(0, 5).join(' ')
      if (words.length > 12) base.push(`IB ${short} ${words}`)
    }
  }

  return [...new Set(base.map((k) => k.toLowerCase().replace(/\s+/g, ' ').trim()))]
}

export function buildIbCourseLessonDescription(subject: IbSubject, lesson: CourseLesson): string {
  const lp = levelPhrase(subject)
  const short = ibShortName(subject)
  const core = `Free IB Diploma ${subject.name} (${lp}) lesson on ${lesson.title} — syllabus ${lesson.topicCode}. Visual revision, markband tips, worked examples and criterion practice marking for IB ${short}.`
  return formatMetaDescription(core)
}

export function buildIbCourseLessonTitle(subject: IbSubject, lesson: CourseLesson): string {
  const short = ibShortName(subject)
  const lp = levelShort(subject)
  const raw = `${lesson.title} — IB ${short} ${lp}`
  return formatSerpTitle(raw, true)
}

export function buildIbCourseLessonFaqs(
  subject: IbSubject,
  lesson: CourseLesson
): CourseFaqItem[] {
  const lp = levelPhrase(subject)
  const short = ibShortName(subject)
  const path = ibCourseLessonPath(subject.slug, lesson.slug)
  const markCode = ibMarkCode(subject.slug)

  const generated: CourseFaqItem[] = [
    {
      q: `Where can I learn ${lesson.title} for IB ${subject.name}?`,
      a: `This free lesson on MarkScheme covers syllabus point ${lesson.topicCode} (${lesson.title}) for IB Diploma ${subject.name} (${lp}). It includes visual revision, key points, and links to criterion-based practice marking at markscheme.app${path}.`,
    },
    {
      q: `Is ${lesson.title} (${lesson.topicCode}) on IB ${short} free to study?`,
      a: `Yes. The IB ${subject.name} course on MarkScheme is 100% free — including visual lessons, exam tips, flashcards, and criterion practice marking. No paywall for ${lesson.title}.`,
    },
    {
      q: `How is IB ${subject.name} marked for ${lesson.title}?`,
      a: `IB uses markbands and assessment criteria rather than Cambridge B1/M1/A1 codes. For ${lesson.title}, examiners place your response in a level band against descriptors — our /mark tool scores criterion-by-criterion for IB ${short}.`,
    },
    {
      q: `How do I revise ${lesson.title} for IB ${short} exams?`,
      a: `Start with the visual steps on this page, note the key exam points, then practise with IB criterion marking on ${lesson.title} using MarkScheme's practice mode (/mark?subject=${markCode}&topic=${encodeURIComponent(lesson.topicCode)}).`,
    },
    {
      q: `How is this ${lesson.title} lesson different from ZNotes or RevisionDojo?`,
      a: `MarkScheme teaches IB ${lesson.topicCode} with interactive visual revision, simpler explanations, worked examples, and built-in criterion marking — not static PDF notes alone.`,
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

export function buildIbCourseLessonIntro(
  subject: IbSubject,
  lesson: CourseLesson
): { heading: string; paragraph: string } {
  const lp = levelPhrase(subject)
  const short = ibShortName(subject)

  const heading = `Revise ${lesson.title} for IB ${subject.name} (${lesson.topicCode})`

  const paragraph = `Looking for **free IB ${subject.name} notes** on **${lesson.title}**? This ${lp} lesson covers official syllabus point **${lesson.topicCode}** on ${lesson.paperName}. Use the visual steps, key terms, and quick checks below — then practise with **IB criterion marking** on ${lesson.title}. Built for students searching "IB ${short} ${lesson.topicCode}", "${lesson.title} IB revision", or a free alternative to paid IB note sites.`

  return { heading, paragraph }
}

export function buildIbCourseLessonSeo(
  subject: IbSubject,
  lesson: CourseLesson
): IbCourseLessonSeo {
  const intro = buildIbCourseLessonIntro(subject, lesson)
  const markCode = ibMarkCode(subject.slug)
  return {
    title: buildIbCourseLessonTitle(subject, lesson),
    description: buildIbCourseLessonDescription(subject, lesson),
    keywords: buildIbCourseLessonKeywords(subject, lesson),
    introHeading: intro.heading,
    introParagraph: intro.paragraph,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'IB courses', path: '/ib/courses' },
      { name: `${subject.name} ${levelShort(subject)}`, path: ibCoursePath(subject.slug) },
      { name: lesson.title, path: ibCourseLessonPath(subject.slug, lesson.slug) },
    ],
    faqs: buildIbCourseLessonFaqs(subject, lesson),
    markPath: `/mark?subject=${markCode}&topic=${encodeURIComponent(lesson.topicCode)}`,
  }
}
