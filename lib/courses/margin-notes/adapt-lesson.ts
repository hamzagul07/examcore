import type { CourseLesson, LessonSection, PastPaperQuestionRef } from '@/lib/courses/types'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import { parseFormulaParts } from '@/lib/courses/formula-parts'
import { extractKeyTakeaways } from '@/lib/courses/lesson-toc-helpers'
import {
  extractWorkedExamples,
  partitionEnrichedBlocks,
} from '@/lib/courses/lesson-layout'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { hasExplorable } from '@/lib/courses/explorables'
import { resolveLessonInteractiveEmbed } from '@/lib/courses/interactive-embeds'
import { filterResourcesForPromotedEmbed } from '@/lib/courses/embed-from-resources'
import { resolveDiagramSpec } from '@/lib/courses/diagram-specs'
import type {
  LessonFormula,
  LessonNote,
  LessonPractice,
  LessonStep,
  MarginNotesLesson,
  MarginNotesTopic,
} from '@/lib/courses/margin-notes/types'
import { topicNeighbors } from '@/lib/courses/margin-notes/adapt-spine'

function splitHeroTitle(title: string): { heroPre?: string; heroEm?: string } {
  const commaMatch = title.match(/^(.+?,\s*)([^,]+)$/)
  if (commaMatch) return { heroPre: commaMatch[1].trimEnd(), heroEm: commaMatch[2].trim() }
  const andMatch = title.match(/^(.+?)\s+(&|and)\s+(.+)$/i)
  if (andMatch) return { heroPre: `${andMatch[1]} ${andMatch[2]}`, heroEm: andMatch[3] }
  return {}
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\$([^$]+)\$/g, '$1').trim()
}

function splitSolutionSteps(solution: string): string[] {
  const lines = solution.split('\n').filter(Boolean)
  const numbered = lines.filter((l) => /^\d+[.)]\s/.test(l.trim()))
  if (numbered.length >= 2) {
    return numbered.map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
  }
  const paras = solution.split(/\n\n+/).filter(Boolean)
  if (paras.length >= 2) return paras
  return [solution]
}

function extractNotes(sections: LessonSection[]): LessonNote[] {
  const notes: LessonNote[] = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (s.type !== 'heading') continue

    const paragraphs: string[] = []
    const bullets: string[] = []
    let tip: string | undefined
    let j = i + 1

    while (j < sections.length) {
      const block = sections[j]
      if (
        block.type === 'heading' ||
        block.type === 'practice' ||
        block.type === 'resources' ||
        block.type === 'workedExample'
      ) {
        break
      }
      if (block.type === 'text') {
        paragraphs.push(block.content)
      } else if (block.type === 'keyPoints') {
        bullets.push(...block.items)
      } else if (block.type === 'formula') {
        paragraphs.push(block.content)
      } else if (block.type === 'examTip' && !tip) {
        tip = block.content
      }
      j++
    }

    if (paragraphs.length || bullets.length) {
      notes.push({
        h: s.content,
        p: paragraphs.join('\n\n'),
        bullets: bullets.length ? bullets : undefined,
        tip,
      })
    }
    i = j - 1
  }
  return notes
}

function formulaLatex(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (t.includes('$')) return t
  return `$${t}$`
}

function isLatexFormula(raw: string): boolean {
  return /\\|[_{^]|\\frac|\\rho|\\Delta|\\lambda|\\theta/.test(raw)
}

function plainFormulaTex(latex: string): string {
  return latex
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formulasFromLesson(
  lesson: CourseLesson,
  enriched: EnrichedVisualLesson,
  subjectCode: string
): LessonFormula[] {
  const formulas: LessonFormula[] = []
  const seen = new Set<string>()

  for (const block of enriched.blocks) {
    if (block.type !== 'formula-visual') continue
    const raw = block.expression || block.expressions[0]
    if (!raw || seen.has(raw)) continue
    seen.add(raw)
    const latex = formulaLatex(raw)
    formulas.push({
      latex,
      tex: isLatexFormula(raw) ? plainFormulaTex(latex) : raw,
      parts: block.parts.map((p) => ({ s: p.symbol, m: p.meaning })),
    })
  }

  for (const s of lesson.sections) {
    if (s.type !== 'formula') continue
    const parsed = parseFormulaParts(s.content, lesson, subjectCode)
    const latex = parsed.expressions[0] ?? parsed.expression
    if (!latex || seen.has(latex)) continue
    seen.add(latex)
    formulas.push({
      latex,
      tex: isLatexFormula(latex) ? plainFormulaTex(latex) : plainFormulaTex(latex) || latex,
      parts: parsed.parts.map((p) => ({ s: p.symbol, m: p.meaning })),
    })
  }

  return formulas
}

function buildSteps(
  lesson: CourseLesson,
  enriched: EnrichedVisualLesson,
  lessonSlug: string
): LessonStep[] | undefined {
  const spec = resolveDiagramSpec(lessonSlug, lesson.diagramSpec)
  if (spec?.steps?.length) {
    return spec.steps.map((s, i) => ({
      n: i + 1,
      title: s.caption?.split(/[.—]/)[0]?.trim() || `Step ${i + 1}`,
      body: s.caption ?? s.embedHint ?? '',
    }))
  }

  const partitioned = partitionEnrichedBlocks(enriched.blocks)
  if (partitioned.stepCarousel?.steps.length) {
    return partitioned.stepCarousel.steps.map((s, i) => ({
      n: i + 1,
      title: s.label,
      body: s.detail,
    }))
  }

  if (lesson.simpleExplanation?.steps?.length && !hasLessonLiveDiagram(lessonSlug)) {
    return lesson.simpleExplanation.steps.map((body, i) => ({
      n: i + 1,
      title: `Step ${i + 1}`,
      body,
    }))
  }

  return undefined
}

function lessonTag(status: CourseLesson['status']): string {
  if (status === 'premium' || status === 'published') return 'premium'
  if (status === 'pilot') return 'pilot'
  if (status === 'outline') return 'outline'
  return 'topic'
}

function buildPracticeQuestions(
  lesson: CourseLesson,
  pastPaperQuestions: PastPaperQuestionRef[]
): LessonPractice[] {
  const ppSection = lesson.sections.find((s) => s.type === 'pastPaperPractice')
  if (ppSection?.type === 'pastPaperPractice' && ppSection.questions.length) {
    return ppSection.questions.map((q) => ({
      ref: `${q.paperVariant} · ${q.session} ${q.year} · Q${q.questionNumber}`,
      marks: q.marks,
      text: q.questionTextPreview,
      href: q.markHref,
      markPoints: q.markPoints,
    }))
  }

  if (pastPaperQuestions.length) {
    return pastPaperQuestions.map((q) => ({
      ref: `${q.paperCode} · Q${q.questionNumber}`,
      marks: q.totalMarks,
      text: q.questionText,
      href: q.markHref,
    }))
  }

  const practice = lesson.sections.find((s) => s.type === 'practice')
  if (practice?.type === 'practice') {
    return [
      {
        ref: practice.label,
        marks: 0,
        text: practice.label,
        href: practice.href,
      },
    ]
  }

  return []
}

function nodeLabel(text: string): string {
  const clean = stripMarkdown(text)
  const bold = clean.match(/^\*\*([^*]+)\*\*/)
  if (bold) return bold[1].trim()
  const varIs = clean.match(/^['']?([a-zA-Z_][\w{}^]*)['']?\s+is\s+(?:the\s+)?(.+?)(?:\.|$)/i)
  if (varIs) {
    const noun = varIs[2].replace(/\s+/g, ' ').trim()
    const short = noun.length > 22 ? `${noun.slice(0, 19)}…` : noun
    return `${short.charAt(0).toUpperCase()}${short.slice(1)} (${varIs[1]})`
  }
  const lead = clean.match(/^([^(]+?)(?:\s*\(|:)/)
  if (lead) {
    const trimmed = lead[1].trim()
    if (trimmed.length >= 3 && trimmed.length <= 36) return trimmed
  }
  const firstSentence = clean.split(/\.\s+/)[0]?.trim()
  if (firstSentence && firstSentence.length <= 36) return firstSentence
  return clean.length > 36 ? `${clean.slice(0, 33)}…` : clean
}

function nodeDetail(text: string, defLookup: Map<string, string>): string {
  const label = nodeLabel(text).toLowerCase()
  for (const [key, def] of defLookup) {
    if (label.includes(key) || key.includes(label)) return def
  }
  return text.replace(/^\*\*([^*]+)\*\*[:\s—–-]*/u, '').trim() || text
}

function buildConceptMap(
  lesson: CourseLesson,
  partitioned: ReturnType<typeof partitionEnrichedBlocks>,
  glossaryTerms: { t: string; d: string }[] | undefined
): MarginNotesLesson['conceptMap'] {
  const defLookup = new Map<string, string>()
  for (const g of glossaryTerms ?? []) {
    defLookup.set(g.t.toLowerCase(), g.d)
  }
  for (const t of partitioned.keyTerms?.terms ?? []) {
    defLookup.set(t.term.toLowerCase(), t.definition)
  }

  let nodeLabels: string[] = []
  if (partitioned.conceptMap?.nodes.length) {
    nodeLabels = partitioned.conceptMap.nodes
  } else {
    const keyPoints = lesson.sections
      .filter((s): s is Extract<LessonSection, { type: 'keyPoints' }> => s.type === 'keyPoints')
      .flatMap((s) => s.items)
    if (keyPoints.length >= 3) {
      nodeLabels = keyPoints.slice(0, 6)
    } else if (lesson.learningObjectives && lesson.learningObjectives.length >= 3) {
      nodeLabels = lesson.learningObjectives.slice(0, 5)
    }
  }

  if (nodeLabels.length < 3) return undefined

  return {
    center: partitioned.conceptMap?.center ?? lesson.title,
    nodes: nodeLabels.slice(0, 6).map((label, i) => ({
      id: `n${i}`,
      t: nodeLabel(label),
      d: nodeDetail(label, defLookup),
    })),
  }
}

function simplerByHeading(lesson: CourseLesson): Record<string, string> | undefined {
  const steps = lesson.simpleExplanation?.steps
  const notes = extractNotes(lesson.sections)
  if (!steps?.length || !notes.length) return undefined
  const map: Record<string, string> = {}
  notes.forEach((n, i) => {
    if (steps[i]) map[n.h] = steps[i]
  })
  return Object.keys(map).length ? map : undefined
}

export function adaptLesson(
  subjectCode: string,
  subjectName: string,
  lesson: CourseLesson,
  pastPaperQuestions: PastPaperQuestionRef[],
  flatTopics: MarginNotesTopic[],
  opts: { enriched: EnrichedVisualLesson }
): MarginNotesLesson {
  const enriched = opts.enriched
  const partitioned = partitionEnrichedBlocks(enriched.blocks)
  const interactiveEmbed = resolveLessonInteractiveEmbed(lesson)
  const liveDiagram = hasLessonLiveDiagram(lesson.slug)
  const steps = buildSteps(lesson, enriched, lesson.slug)
  const hasVisual = !!(
    liveDiagram ||
    interactiveEmbed ||
    steps?.length ||
    hasExplorable(lesson.slug)
  )

  const introSection = lesson.sections.find((s) => s.type === 'intro')
  const intro = introSection?.type === 'intro' ? introSection.content : lesson.summary

  const worked = extractWorkedExamples(lesson).map((w, i) => ({
    title: `Worked example ${i + 1}`,
    q: w.question,
    steps: splitSolutionSteps(w.solution),
  }))

  const glossaryFromTerms = partitioned.keyTerms?.terms.map((t) => ({
    t: t.term,
    d: t.definition,
  }))

  const glossaryFromCards = lesson.flashcards?.slice(0, 12).map((f) => ({
    t: f.pillLabel ?? stripMarkdown(f.front).slice(0, 40),
    d: f.back,
  }))

  const quizItems =
    lesson.quickCheck?.map((q) => ({ q: q.prompt, a: q.answer })) ??
    partitioned.quickCheck?.items.map((q) => ({ q: q.prompt, a: q.answer }))

  const flashcards =
    lesson.flashcards?.map((f) => ({ q: f.front, a: f.back })) ??
    partitioned.flashcards?.cards.map((f) => ({ q: f.front, a: f.back }))

  const glossary =
    glossaryFromTerms?.length ? glossaryFromTerms : glossaryFromCards?.length ? glossaryFromCards : undefined

  const conceptMap = buildConceptMap(lesson, partitioned, glossary)

  const { prev, next, related } = topicNeighbors(flatTopics, lesson.topicCode)
  const hero = splitHeroTitle(lesson.title)
  const resourcesSection = lesson.sections.find((s) => s.type === 'resources')
  const resources = filterResourcesForPromotedEmbed(
    resourcesSection?.type === 'resources' && resourcesSection.items.length
      ? resourcesSection.items
      : undefined,
    interactiveEmbed
  )

  const notes = extractNotes(lesson.sections)
  const formulas = formulasFromLesson(lesson, enriched, subjectCode)
  const takeaways = extractKeyTakeaways(lesson)
  const comparisonTable = partitioned.comparisonTable
    ? {
        title: partitioned.comparisonTable.title,
        caption: partitioned.comparisonTable.caption,
        columns: partitioned.comparisonTable.columns,
        rows: partitioned.comparisonTable.rows,
      }
    : lesson.comparisonTable?.rows?.length
      ? {
          title: lesson.comparisonTable.caption ?? 'At a glance — side by side',
          caption: lesson.comparisonTable.caption,
          columns: lesson.comparisonTable.columns,
          rows: lesson.comparisonTable.rows,
        }
      : undefined

  const practiceQuestions = buildPracticeQuestions(lesson, pastPaperQuestions)

  return {
    code: subjectCode,
    sub: subjectName,
    point: lesson.topicCode,
    name: lesson.title,
    slug: lesson.slug,
    lessonSlug: lesson.slug,
    ...hero,
    papers: `${lesson.paper} · ${lesson.paperName}`,
    tag: lessonTag(lesson.status),
    mins: lesson.durationMin,
    intro,
    objectives: lesson.learningObjectives,
    subtopics: lesson.subtopics,
    simple: lesson.simpleExplanation
      ? {
          title: lesson.simpleExplanation.title,
          lead: lesson.simpleExplanation.summary,
          analogy: lesson.simpleExplanation.analogy ?? '',
          steps: lesson.simpleExplanation.steps?.length
            ? lesson.simpleExplanation.steps
            : undefined,
          simplerByHeading: simplerByHeading(lesson),
        }
      : undefined,
    diagram: hasVisual ? 'live' : undefined,
    steps,
    formulas: formulas.length ? formulas : undefined,
    comparisonTable,
    notes: notes.length ? notes : undefined,
    worked: worked.length ? worked : undefined,
    conceptMap,
    glossary,
    quiz: quizItems?.length ? quizItems : undefined,
    flashcards: flashcards?.length ? flashcards : undefined,
    takeaways: takeaways.length ? takeaways : undefined,
    faqs: lesson.faq,
    practice: practiceQuestions[0],
    practiceQuestions: practiceQuestions.length ? practiceQuestions : undefined,
    prev: prev ?? undefined,
    next: next ?? undefined,
    related: related.length ? related : undefined,
    outline: lesson.status === 'outline',
    hasVisual,
    template: enriched.template,
    diagramSpec: lesson.diagramSpec ?? null,
    interactiveEmbed: interactiveEmbed ?? null,
    resources,
  }
}
