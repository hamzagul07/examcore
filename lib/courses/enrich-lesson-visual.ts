import fs from 'fs'
import { boardLabel } from '@/lib/courses/board'
import path from 'path'
import type { CourseLesson } from '@/lib/courses/types'
import type { EnrichedVisualLesson, VisualBlock, VisualStep } from '@/lib/courses/visual-types'
import { detectVisualTemplate, diagramPath } from '@/lib/courses/visual-profile'
import { parseFormulaParts } from '@/lib/courses/formula-parts'
import { glossaryFromBoldTerms } from '@/lib/courses/margin-notes/glossary-terms'
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

/** "State Kirchhoff's First", "Under what condition is" — a question cut short, not a term. */
function isTermLike(label: string): boolean {
  const words = label.trim().split(/\s+/)
  if (!words.length || words.length > 4) return false
  if (/^(?:what|which|why|how|when|where|state|define|explain|describe|calculate|under|give|name)$/i.test(words[0]!)) return false
  if (/^(?:a|an|the|of|in|is|are|for|to|and|or|between|from|with|by|on|at|as|you|your|it|its|this|that|when|if)$/i.test(words[words.length - 1]!)) return false
  return true
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

  // The terms the author bolded, each with the sentence that defines it —
  // the glossary a textbook would print.
  for (const g of glossaryFromBoldTerms(lesson)) add(g.t, g.d)

  for (const s of lesson.sections) {
    if (s.type !== 'formula') continue
    const lines = s.content.split('\n').filter(Boolean)
    for (const line of lines) {
      const m = line.match(/\*\*([^*]+)\*\*/)
      if (m) add(m[1]!, line.replace(/\*\*/g, ''))
    }
  }

  // Flashcards fill in only when the author bolded little, and only cards
  // whose label reads as a term rather than as the start of a question.
  if (terms.length < 4) {
    for (const fc of lesson.flashcards ?? []) {
      const label = glossaryLabelFromFlashcard(fc.front, fc.back, fc.pillLabel)
      if (fc.pillLabel?.trim() || isTermLike(label)) add(label, fc.back)
    }
  }

  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  const items = keyPoints?.type === 'keyPoints' ? keyPoints.items : []
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
          // Board is derived: this alt text read "for Cambridge ib-biology-hl"
          // on every IB diagram — wrong board and an internal slug, in the one
          // string a screen-reader user actually hears.
          alt: `${lesson.title} diagram — ${boardLabel(subjectCode)}`,
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
