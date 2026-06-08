import type { LessonEvidence } from '@/lib/courses/content-source.schema'
import type { PaperKind } from '@/lib/courses/types'

export type LessonPromptContext = {
  subjectCode: string
  paperNumber: string
  topicCode: string
  topicTitle: string
  slug: string
  paperKind: PaperKind
  paperDisplayName: string
}

function paperStyleGuide(paperKind: PaperKind): string {
  switch (paperKind) {
    case 'mcq':
      return `Paper 1 (MCQ):
- Short, precise explanations suitable for multiple-choice revision.
- Include quickCheck items with 4 options (A–D style) where helpful.
- Worked examples should mirror real MCQ stems — one mark each.
- Use flashcards for definitions and recall facts.`
    case 'practical':
      return `Paper 3 (Practical):
- Emphasise experimental technique, uncertainty, graphing, and data analysis.
- Worked examples should walk through practical-style calculations and conclusions.
- Include exam tips on significant figures, error propagation, and graph gradients.
- Reference real past-paper practical questions in worked examples.`
    case 'structured':
      return `Structured paper:
- Build multi-mark worked solutions with clear mark-scheme alignment.
- Show working, units, and examiner expectations.
- Use keyPoints for common pitfalls and command-word reminders.`
  }
}

function formatEvidenceBlock(evidence: LessonEvidence): string {
  const objectives = evidence.objectives
    .map(
      (o) =>
        `- ${o.objective_number}: ${o.objective_text} (command words: ${(o.command_words ?? []).join(', ') || 'n/a'})`
    )
    .join('\n')

  const questions = evidence.questions
    .map((q) => {
      const tags = q.tags.map((t) => `${t.objective_number}@${t.confidence.toFixed(2)}`).join(', ')
      return `### Question ${q.id}
- number: ${q.question_number} | marks: ${q.marks ?? '?'} | session: ${q.session} ${q.year}
- tags: ${tags || 'none'}
- text:
${q.question_text}`
    })
    .join('\n\n')

  const questionIds = evidence.questions
    .map((q) => `- ${q.id} (Q${q.question_number}, ${q.marks ?? '?'} marks)`)
    .join('\n')

  const markSchemes = evidence.markSchemes
    .slice(0, 80)
    .map(
      (m) =>
        `- [q=${m.question_id.slice(0, 8)}…] +${m.marks_awarded}: ${m.point_text}${m.examiner_notes ? ` (note: ${m.examiner_notes})` : ''}`
    )
    .join('\n')

  return `## Syllabus objectives (${evidence.objectives.length})
${objectives || '(none)'}

## Question UUIDs — copy exactly into workedExample.sourceQuestionId
${questionIds || '(none)'}

## Past-paper questions (${evidence.questions.length}) — USE THESE for worked examples
${questions || '(none)'}

## Mark scheme points (${evidence.markSchemes.length})
${markSchemes || '(none)'}`
}

export function buildLessonSystemPrompt(ctx: LessonPromptContext): string {
  return `You are an expert Cambridge International A-Level Physics (${ctx.subjectCode}) lesson author.

Generate a single JSON object for a **paper-scoped** lesson — content tailored to ${ctx.paperDisplayName} only.

Hard rules:
1. Output ONLY valid JSON — no markdown fences, no commentary.
2. Worked examples MUST be sections with type "workedExample" (not a top-level array).
3. Every workedExample MUST include sourceQuestionId set to the UUID of the past-paper question it is based on.
4. Do NOT invent past-paper questions — only use questions from the evidence block.
5. Use KaTeX for maths: inline $...$ and display $$...$$. Escape backslashes in JSON strings.
6. British English. Cambridge command words. Student-facing tone (ages 16–18).
7. status must be "pilot".
8. paper must be "P${ctx.paperNumber}" (single paper, not combined).
9. Include paperNumber, paperType, level, syllabusObjectivesCovered (omit pastPaperReferences — added server-side).
10. Section types MUST be exactly: intro, heading, text, formula, keyPoints, examTip, workedExample, practice, resources. Do NOT output pastPaperPractice (added server-side).
11. Flashcards use { "front": "...", "back": "..." } with optional "pillLabel" (1–3 word glossary pill, never a truncated question).
12. NEVER embed HTML <img> tags in any field. Figures are attached server-side from extracted_diagrams.
13. Every heading section MUST be immediately followed by at least one text, formula, or keyPoints section with ≥2 sentences. If you cannot expand a subtopic, omit the heading.
14. quickCheck prompts must be complete questions (≥6 words, end with ?). Good: "Define displacement and state its SI unit." Bad: "Displacement?"
15. In workedExample question text, keep MCQ options A–D on separate lines when present.

${paperStyleGuide(ctx.paperKind)}

Lesson JSON shape (match existing CourseLesson renderer):
- slug, topicCode, title, paper, paperName, status, summary, durationMin
- sections: intro, heading, text, formula, keyPoints, examTip, workedExample, practice, resources
- learningObjectives, simpleExplanation, flashcards, faq (optional)
- quickCheck (optional, Paper 1 MCQ)
- Do NOT include pastPaperReferences in output.`
}

export function buildLessonUserPrompt(
  ctx: LessonPromptContext,
  evidence: LessonEvidence
): string {
  return `Generate a pilot lesson JSON for:

- Subject: ${ctx.subjectCode}
- Paper: ${ctx.paperNumber} (${ctx.paperDisplayName})
- Topic: ${ctx.topicCode} — ${ctx.topicTitle}
- Slug: ${ctx.slug}
- paperType: ${ctx.paperKind}
- level: A-Level

Requirements:
- Cover ALL syllabus objectives listed below.
- At least ${Math.min(3, evidence.questions.length)} sections with type exactly "workedExample", each with question, solution, and sourceQuestionId (UUID from evidence).
- Place workedExample sections inside the sections array — never a separate workedExamples array.
- Do NOT include pastPaperReferences or <img> tags (added server-side).
- syllabusObjectivesCovered: list of objective_number strings you taught.
- durationMin: realistic (15–35 min).
- summary: SEO-friendly, mentions Paper ${ctx.paperNumber}.

${formatEvidenceBlock(evidence)}`
}
