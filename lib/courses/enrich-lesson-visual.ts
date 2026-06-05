import fs from 'fs'
import path from 'path'
import type { CourseLesson, LessonSection } from '@/lib/courses/types'
import type {
  EnrichedVisualLesson,
  FormulaPart,
  VisualBlock,
  VisualStep,
} from '@/lib/courses/visual-types'
import { detectVisualTemplate, diagramPath } from '@/lib/courses/visual-profile'

function chunkText(text: string, maxWords = 45): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const chunks: string[] = []
  let buf = ''
  for (const s of sentences) {
    const next = buf ? `${buf} ${s}` : s
    if (next.split(/\s+/).length > maxWords && buf) {
      chunks.push(buf.trim())
      buf = s
    } else {
      buf = next
    }
  }
  if (buf.trim()) chunks.push(buf.trim())
  return chunks.length ? chunks : [text]
}

function parseFormulaParts(expr: string): { expression: string; parts: FormulaPart[] } {
  const clean = expr.replace(/\s+/g, ' ').trim()
  if (/I\s*=\s*Q\s*\/\s*t/i.test(clean)) {
    return {
      expression: 'I = Q / t',
      parts: [
        { symbol: 'I', meaning: 'Current (amperes)', color: 'var(--ec-brand)' },
        { symbol: 'Q', meaning: 'Charge (coulombs)', color: '#22c55e' },
        { symbol: 't', meaning: 'Time (seconds)', color: '#f59e0b' },
      ],
    }
  }
  if (/F\s*=\s*ma/i.test(clean)) {
    return {
      expression: 'F = ma',
      parts: [
        { symbol: 'F', meaning: 'Resultant force (N)', color: 'var(--ec-brand)' },
        { symbol: 'm', meaning: 'Mass (kg)', color: '#22c55e' },
        { symbol: 'a', meaning: 'Acceleration (m s⁻²)', color: '#f59e0b' },
      ],
    }
  }
  return {
    expression: clean.slice(0, 80),
    parts: [{ symbol: '∑', meaning: 'Key relationship for this topic', color: 'var(--ec-brand)' }],
  }
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
  const bold = extractBoldTerms(lesson.sections)
  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  const items = keyPoints?.type === 'keyPoints' ? keyPoints.items : []

  if (bold.length) {
    return bold.map((term, i) => ({
      term,
      definition: items[i] ?? lesson.summary,
    }))
  }
  return items.slice(0, 6).map((item) => {
    const words = item.split(/\s+/).slice(0, 3).join(' ')
    return { term: words, definition: item }
  })
}

function quickChecksFromLesson(lesson: CourseLesson): { prompt: string; answer: string }[] {
  const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
  if (keyPoints?.type === 'keyPoints') {
    return keyPoints.items.slice(0, 6).map((answer, i) => ({
      prompt: `Point ${i + 1}: Can you explain this without looking?`,
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

function snapshotsFromSections(sections: LessonSection[]): { title: string; body: string }[] {
  const cards: { title: string; body: string }[] = []
  let heading = 'Key idea'
  for (const s of sections) {
    if (s.type === 'heading') heading = s.content
    if (s.type === 'intro' || s.type === 'text') {
      for (const chunk of chunkText(s.content.replace(/\*\*/g, ''))) {
        cards.push({ title: heading, body: chunk })
      }
    }
  }
  return cards.slice(0, 6)
}

export function enrichLessonVisual(
  subjectCode: string,
  lesson: CourseLesson
): EnrichedVisualLesson {
  const template = detectVisualTemplate(subjectCode, lesson)
  const blocks: VisualBlock[] = []

  blocks.push({
    type: 'hero-visual',
    template,
    title: lesson.title,
    caption: lesson.summary,
  })

  const steps = stepsFromLesson(lesson)

  blocks.push({
    type: 'learning-path',
    title: 'Your revision journey',
    steps,
  })

  blocks.push({
    type: 'step-carousel',
    title: 'Go step by step',
    steps,
  })

  const terms = keyTermsFromLesson(lesson)
  if (terms.length >= 2) {
    blocks.push({ type: 'key-terms', title: 'Important words to know', terms })
  }

  const nodes = conceptNodesFromLesson(lesson)
  if (nodes.length >= 3) {
    blocks.push({
      type: 'concept-map',
      center: lesson.title,
      nodes,
    })
  }

  const diagramFile = path.join(
    process.cwd(),
    'public',
    'courses',
    'diagrams',
    subjectCode,
    `${lesson.slug}.png`
  )
  if (fs.existsSync(diagramFile)) {
    blocks.push({
      type: 'diagram-image',
      src: diagramPath(subjectCode, lesson.slug),
      alt: `${lesson.title} diagram for Cambridge ${subjectCode}`,
    })
  } else if (lesson.diagram?.src) {
    blocks.push({
      type: 'diagram-image',
      src: lesson.diagram.src,
      alt: lesson.diagram.alt,
    })
  }

  for (const s of lesson.sections) {
    if (s.type === 'formula') {
      const parsed = parseFormulaParts(s.content)
      blocks.push({
        type: 'formula-visual',
        expression: parsed.expression,
        parts: parsed.parts,
      })
    }
  }

  const checks = quickChecksFromLesson(lesson)
  if (checks.length) {
    blocks.push({ type: 'quick-check', title: 'Quick check — can you answer these?', items: checks })
  }

  const snapshots = snapshotsFromSections(lesson.sections)
  if (snapshots.length) {
    blocks.push({ type: 'snapshots', title: 'Bite-sized ideas', cards: snapshots })
  }

  if (lesson.simpleExplanation) {
    const keyPoints = lesson.sections.find((x) => x.type === 'keyPoints')
    const examPoints =
      keyPoints?.type === 'keyPoints'
        ? keyPoints.items.slice(0, 3)
        : ['Use mark-scheme vocabulary', 'Show working', 'State units']
    blocks.push({
      type: 'compare',
      title: 'Simple vs exam-ready',
      simple: {
        title: 'Explain it simply',
        points: [
          lesson.simpleExplanation.summary,
          ...(lesson.simpleExplanation.analogy ? [lesson.simpleExplanation.analogy] : []),
        ],
      },
      exam: {
        title: 'What examiners want',
        points: examPoints,
      },
    })
  }

  for (const s of lesson.sections) {
    if (s.type === 'workedExample') {
      blocks.push({
        type: 'worked-visual',
        question: s.question,
        solution: s.solution,
      })
    }
    if (s.type === 'examTip') {
      blocks.push({ type: 'exam-tip', content: s.content })
    }
    if (s.type === 'practice') {
      blocks.push({ type: 'practice-cta', label: s.label, href: s.href })
    }
  }

  return { template, blocks }
}
