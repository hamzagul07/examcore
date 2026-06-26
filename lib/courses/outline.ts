import type { CourseLesson, LessonSection, SimpleExplanation } from '@/lib/courses/types'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type { SyllabusTopic } from '@/lib/syllabi'

function inferCourseLevel(subjectCode: string): string {
  if (/^(4|5)\d{3}$/.test(subjectCode)) return 'IGCSE/O-Level'
  if (/^(22|71|77)\d{2}$/.test(subjectCode)) return 'O-Level'
  return 'A-Level'
}

function defaultSimpleExplanation(topic: SyllabusTopic): SimpleExplanation {
  return {
    title: `${topic.name} — explained simply`,
    summary: `Think of ${topic.name.toLowerCase()} as one building block in your ${topic.paperName} toolkit. Examiners rarely ask for memorised paragraphs — they want you to apply the idea in a structured answer.`,
    analogy: `If the full lesson feels dense, focus on one past-paper question: read the mark scheme after attempting it — that shows what Cambridge actually rewards.`,
    steps: [
      `Read the definition and symbols for ${topic.name}`,
      `Sketch a quick diagram or equation if the topic is visual`,
      `Attempt one real past-paper question on this topic`,
      `Mark strictly, then re-read only the marks you lost`,
    ],
  }
}

export function buildOutlineLesson(
  subjectCode: string,
  subjectName: string,
  topic: SyllabusTopic
): CourseLesson {
  const slug = topicToLessonSlug(topic.code, topic.name)
  const level = inferCourseLevel(subjectCode)

  const sections: LessonSection[] = [
    {
      type: 'intro',
      content: `Welcome to your **free ${subjectName}** lesson on **${topic.name}** (${topic.code}). This is syllabus point ${topic.code} on **${topic.paperName}** — structured like a premium revision course, with past-paper practice built in.`,
    },
    {
      type: 'keyPoints',
      items: [
        `Master the vocabulary examiners use in mark schemes for ${topic.name}`,
        `Know which paper (${topic.paper}) tests this topic most often`,
        `Practise at least one official past-paper question after reading`,
        `Use “Explain simpler” below if the main lesson feels too advanced`,
      ],
    },
    {
      type: 'examTip',
      content:
        subjectCode === '7115'
          ? `Cambridge ${subjectCode} rewards answers tied to the case business — name the firm, quote stimulus data, and balance advantages against disadvantages. On ${topic.paperName}, ${topic.name} often appears as part of a longer structured or case question.`
          : subjectCode === '2281'
            ? `Cambridge ${subjectCode} rewards clear definitions, labelled diagrams, and applied examples from the data. On ${topic.paperName}, ${topic.name} often appears as MC items or structured questions — plan before writing longer answers.`
            : `Cambridge ${subjectCode} rewards clear diagrams, labelled quantities, and method before final answers. On ${topic.paperName}, ${topic.name} often appears as part of a longer structured question — plan 30 seconds before writing.`,
    },
    {
      type: 'practice',
      label: `Mark a past-paper question on ${topic.name}`,
      href: `/mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}`,
    },
    {
      type: 'resources',
      items: [
        { label: `${subjectCode} marking & past papers`, href: `/subjects/${subjectCode}` },
        { label: 'How to read mark schemes', href: '/blog/how-to-read-a-cambridge-mark-scheme' },
        {
          label: 'Official Cambridge syllabus',
          href: 'https://www.cambridgeinternational.org/programmes-and-qualifications/',
        },
      ],
    },
  ]

  return {
    slug,
    topicCode: topic.code,
    title: topic.name,
    paper: topic.paper,
    paperName: topic.paperName,
    status: 'outline',
    summary: `Free ${level} ${subjectName} course lesson: ${topic.name} (${topic.code}). Premium-quality notes, simpler explanation mode, and real Cambridge past-paper questions.`,
    durationMin: 12,
    learningObjectives: [
      `Understand ${topic.name} for syllabus ${topic.code}`,
      `Recognise how ${topic.paperName} tests this topic`,
      `Apply the concept in a real past-paper question`,
    ],
    simpleExplanation: defaultSimpleExplanation(topic),
    faq: [
      {
        q: `Is this ${subjectName} ${topic.name} lesson free?`,
        a: `Yes — every topic in our ${subjectCode} course is free. MarkScheme offers free past-paper marking so you can turn notes into marks.`,
      },
      {
        q: `Which past papers cover ${topic.code}?`,
        a: `Scroll to the past-paper section on this page — we surface real Cambridge questions tagged to ${topic.code} from our mark-scheme library.`,
      },
    ],
    sections,
  }
}
