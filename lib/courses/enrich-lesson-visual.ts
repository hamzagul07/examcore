import fs from 'fs'
import path from 'path'
import type { CourseLesson, LessonSection } from '@/lib/courses/types'
import type { EnrichedVisualLesson, VisualBlock, VisualStep } from '@/lib/courses/visual-types'
import { detectVisualTemplate, diagramPath } from '@/lib/courses/visual-profile'
import { parseFormulaParts } from '@/lib/courses/formula-parts'
import {
  ensureFullQuickCheckPrompt,
  glossaryLabelFromFlashcard,
  quickCheckPromptFromKeyPoint,
} from '@/lib/courses/glossary-label'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { lessonHasInteractiveEmbed } from '@/lib/courses/interactive-embeds'

export type EnrichLessonVisualOptions = {
  /** When true: cap reference images, skip auto concept-map (embed-first layout). */
  slimVisuals?: boolean
}

function stepsFromLesson(lesson: CourseLesson): VisualStep[] {
  if (lesson.simpleExplanation?.steps?.length) {
    return lesson.simpleExplanation.steps.map((detail, i) => ({
      label: `Step ${i + 1}`,
      detail,
    }))
  }
  for (const s of lesson.sections) {
    if (s.type === 'keyPoints' && s.items.length) {
      return s.items.slice(0, 5).map((detail, i) => ({
        label: `Point ${i + 1}`,
        detail,
      }))
    }
  }
  if (lesson.learningObjectives?.length) {
    return lesson.learningObjectives.map((detail, i) => ({
      label: `Goal ${i + 1}`,
      detail,
    }))
  }
  return [{ label: 'Start', detail: lesson.summary }]
}

function extractBoldTerms(sections: LessonSection[]): string[] {
  const terms: string[] = []
  for (const s of sections) {
    if (s.type !== 'intro' && s.type !== 'text') continue
    const matches = s.content.matchAll(/\*\*([^*]+)\*\*/g)
    for (const m of matches) {
      if (m[1] && !terms.includes(m[1])) terms.push(m[1])
    }
  }
  return terms.slice(0, 8)
}

function keyTermsFromLesson(lesson: CourseLesson): { term: string; definition: string }[] {
  const seen = new Set<string>()
  const terms: { term: string; definition: string }[] = []

  function add(term: string, definition: string) {
    const key = term.trim().toLowerCase()
    if (!key || key.length < 2 || seen.has(key)) return
    seen.add(key)
    terms.push({ term: term.trim(), definition: definition.trim() })
  }

  for (const fc of lesson.flashcards ?? []) {
    add(
      glossaryLabelFromFlashcard(fc.front, fc.back, fc.pillLabel),
      fc.back
    )
  }

  const bold = extractBoldTerms(lesson.sections)
  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  const items = keyPoints?.type === 'keyPoints' ? keyPoints.items : []

  bold.forEach((term, i) => {
    add(term, items[i] ?? lesson.summary)
  })

  for (const s of lesson.sections) {
    if (s.type !== 'formula') continue
    const lines = s.content.split('\n').filter(Boolean)
    for (const line of lines) {
      const m = line.match(/\*\*([^*]+)\*\*/)
      if (m) add(m[1], line.replace(/\*\*/g, ''))
    }
  }

  if (!terms.length) {
    items.slice(0, 8).forEach((item) => {
      const words = item.split(/\s+/).slice(0, 3).join(' ')
      add(words, item)
    })
  }

  return terms.slice(0, 20)
}

function quickChecksFromLesson(lesson: CourseLesson): { prompt: string; answer: string }[] {
  if (lesson.quickCheck?.length) {
    return lesson.quickCheck.slice(0, 6).map((item) => ({
      prompt: ensureFullQuickCheckPrompt(item.prompt),
      answer: item.answer,
    }))
  }

  if (lesson.flashcards?.length) {
    return lesson.flashcards.slice(0, 6).map((fc) => ({
      prompt: ensureFullQuickCheckPrompt(fc.front),
      answer: fc.back,
    }))
  }

  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  if (keyPoints?.type === 'keyPoints') {
    return keyPoints.items.slice(0, 6).map((answer, i) => ({
      prompt: ensureFullQuickCheckPrompt(quickCheckPromptFromKeyPoint(answer, i)),
      answer,
    }))
  }

  return (lesson.learningObjectives ?? []).slice(0, 4).map((answer) => ({
    prompt: 'What should you be able to do after this topic?',
    answer,
  }))
}

function conceptNodesFromLesson(lesson: CourseLesson): string[] {
  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  if (keyPoints?.type === 'keyPoints') return keyPoints.items.slice(0, 6)
  return lesson.learningObjectives?.slice(0, 5) ?? [lesson.summary]
}

export function enrichLessonVisual(
  subjectCode: string,
  lesson: CourseLesson,
  options?: EnrichLessonVisualOptions
): EnrichedVisualLesson {
  const slimVisuals = options?.slimVisuals ?? lessonHasInteractiveEmbed(lesson)
  const template = detectVisualTemplate(subjectCode, lesson)
  const blocks: VisualBlock[] = []
  const steps = stepsFromLesson(lesson)

  blocks.push({
    type: 'hero-visual',
    template,
    title: lesson.title,
    caption: lesson.summary,
  })

  blocks.push({
    type: 'step-carousel',
    title: 'Go step by step',
    steps,
  })

  for (const s of lesson.sections) {
    if (s.type === 'formula') {
      const parsed = parseFormulaParts(s.content, lesson, subjectCode)
      blocks.push({
        type: 'formula-visual',
        description: parsed.description,
        expressions: parsed.expressions,
        expression: parsed.expression,
        parts: parsed.parts,
      })
    }
  }

  if (lesson.comparisonTable?.rows?.length) {
    const t = lesson.comparisonTable
    blocks.push({
      type: 'comparison-table',
      title: 'At a glance — side by side',
      caption: t.caption,
      columns: t.columns,
      rows: t.rows,
    })
  }

  const nodes = conceptNodesFromLesson(lesson)
  if (!slimVisuals && nodes.length >= 3) {
    blocks.push({
      type: 'concept-map',
      center: lesson.title,
      nodes,
    })
  }

  const terms = keyTermsFromLesson(lesson)
  if (terms.length >= 1) {
    blocks.push({ type: 'key-terms', title: 'Glossary — every term explained', terms })
  }

  const checks = quickChecksFromLesson(lesson)
  if (checks.length) {
    blocks.push({ type: 'quick-check', title: 'Quick check — can you answer these?', items: checks })
  }

  if (lesson.flashcards?.length) {
    blocks.push({
      type: 'flashcards',
      title: 'Revision flashcards',
      cards: lesson.flashcards.slice(0, 16),
    })
  }

  const alnotesDir = path.join(
    process.cwd(),
    'public',
    'courses',
    'diagrams',
    subjectCode,
    'alnotes',
    lesson.slug
  )
  const alnotesLegacy = path.join(
    process.cwd(),
    'public',
    'courses',
    'diagrams',
    subjectCode,
    'alnotes',
    `${lesson.slug}.png`
  )

  const alnotesPages: { src: string; alt: string }[] = []
  if (fs.existsSync(alnotesDir) && fs.statSync(alnotesDir).isDirectory()) {
    for (const file of fs.readdirSync(alnotesDir).filter((f) => /^page-\d+\.png$/i.test(f)).sort()) {
      alnotesPages.push({
        src: `/courses/diagrams/${subjectCode}/alnotes/${lesson.slug}/${file}`,
        alt: `A-Level Notes notes page for ${lesson.title}`,
      })
    }
  } else if (fs.existsSync(alnotesLegacy)) {
    alnotesPages.push({
      src: `/courses/diagrams/${subjectCode}/alnotes/${lesson.slug}.png`,
      alt: `A-Level Notes reference diagram for ${lesson.title}`,
    })
  } else if (lesson.referenceDiagrams?.length) {
    for (const d of [...lesson.referenceDiagrams].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      alnotesPages.push({ src: d.src, alt: d.alt })
    }
  }

  const hasAlnotes = alnotesPages.length > 0
  const suppressGeneric = hasLessonLiveDiagram(lesson.slug) && !hasAlnotes
  const pagesToShow = slimVisuals ? alnotesPages.slice(0, 1) : alnotesPages

  if (!suppressGeneric) {
    if (hasAlnotes) {
      pagesToShow.forEach((page, i) => {
        blocks.push({
          type: 'diagram-image',
          src: page.src,
          alt: page.alt,
          caption:
            pagesToShow.length > 1
              ? `A-Level Notes — page ${i + 1} of ${pagesToShow.length}`
              : slimVisuals
                ? 'Reference diagram (one page)'
                : 'Reference diagram from A-Level Notes',
        })
      })
    } else if (!slimVisuals) {
      const diagramCandidates = [
        path.join(process.cwd(), 'public', 'courses', 'diagrams', subjectCode, `${lesson.slug}.png`),
        path.join(
          process.cwd(),
          'public',
          'courses',
          'diagrams',
          subjectCode,
          'senpai',
          `${lesson.slug}.png`
        ),
      ]
      const diagramFile = diagramCandidates.find((p) => fs.existsSync(p))
      if (diagramFile) {
        const src = diagramFile.includes(`${path.sep}senpai${path.sep}`)
          ? `/courses/diagrams/${subjectCode}/senpai/${lesson.slug}.png`
          : diagramPath(subjectCode, lesson.slug)
        blocks.push({
          type: 'diagram-image',
          src,
          alt: `${lesson.title} diagram for Cambridge ${subjectCode}`,
        })
      } else if (lesson.diagram?.src) {
        blocks.push({
          type: 'diagram-image',
          src: lesson.diagram.src,
          alt: lesson.diagram.alt,
          caption: lesson.diagram.src.includes('/alnotes/')
            ? 'Reference diagram from A-Level Notes'
            : undefined,
        })
      }
    }
  }

  return { template, blocks }
}
