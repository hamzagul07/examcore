import { MATH_NOTATION_BLOCK, TABLE_NOTATION_BLOCK } from '@/lib/marking/extraction-prompts'
import type { PaperKind } from './paper-meta'

const STRUCTURE_RULES = `STRUCTURE RULES (Cambridge A-Level):
- Max nesting depth: 2 levels — e.g. "4(a)(i)", "2(b)(ii)". Do not invent deeper nesting.
- Sub-parts: lowercase letters (a), (b) then Roman numerals (i), (ii).
- Mark annotations: [N] on leaf parts (e.g. [2]); [Total: N] for question totals. Extract marks as integer "marks" on leaves only.
- Skip cover pages, blank pages, and Data/Formulae sheets — do not emit questions from them.
- variant is the component code (e.g. "32" for qp_32.pdf) — P3 may use 31–38, not only 1–3.`

const MCQ_RULES = `MCQ PAPER RULES (Paper 1):
- Flat numbering: questions "1" through "40" (depth 0 only — no (a)(i) sub-parts).
- Each question has options A, B, C, D — output in the "options" object AND preserve table layout in question_text.
- Set marks: 1 on every question (each MCQ is worth 1 mark).
- High diagram density — note figure_refs for every diagram referenced (e.g. "Fig. 1.2").`

const PRACTICAL_RULES = `PRACTICAL PAPER RULES (Paper 3):
- Typically 2 long experimental questions with (a)(b)(c) and (i)(ii) sub-parts.
- When the paper asks students to record results in a table, output "tables" as structured JSON arrays:
  "tables": [{ "id": "results", "headers": ["Vs/V", "T/s", "1/T/s^-1"], "rows": [] }]
  Use empty rows[] when the table is blank for students to fill — do NOT describe tables in prose only.
- Include uncertainty / evaluation sections as normal sub-parts.`

const STRUCTURED_RULES = `STRUCTURED PAPER RULES (Papers 2/4/5):
- ~6–10 top-level questions with (a)(i) nesting.
- Data tables and Fig. N.M references are common — use "tables" JSON for printed data grids.
- Extract every leaf part with its [N] mark value.`

function paperKindRules(kind: PaperKind): string {
  if (kind === 'mcq') return MCQ_RULES
  if (kind === 'practical') return PRACTICAL_RULES
  return STRUCTURED_RULES
}

export type ExtractionPromptMeta = {
  subjectCode: string
  paperKind: PaperKind
  paperNumber: string
  variant: string
  session: string
  year: number
}

export function buildQuestionPaperExtractionPrompt(meta: ExtractionPromptMeta): string {
  return `You are extracting questions from a Cambridge ${meta.subjectCode} question paper PDF.
Paper ${meta.paperNumber}, variant ${meta.variant}, ${meta.session} ${meta.year}.

Extract EVERY question 1 through N and ALL sub-parts (a), (b), (i), (ii) — even if similar text appeared earlier or the question continues across pages. Do not emit a top-level question number without its sub-parts unless it is a genuine leaf. Cross-check marks shown as [N] on the PDF.

${STRUCTURE_RULES}

${paperKindRules(meta.paperKind)}

${MATH_NOTATION_BLOCK}

${TABLE_NOTATION_BLOCK}

Output ONLY valid JSON (no markdown fences):
{
  "page_count": number,
  "questions": [
    {
      "question_number": "1(a)(i)",
      "parent_number": "1(a)",
      "is_leaf": true,
      "question_text": "full text with $LaTeX$ math",
      "marks": 2,
      "source_page_numbers": [3, 4],
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "tables": [{ "id": "data", "headers": ["col1"], "rows": [["val"]] }],
      "figure_refs": ["Fig. 4.2"]
    }
  ]
}

For MCQ papers omit parent_number on flat questions. For non-MCQ omit "options".
Include parent rows (is_leaf: false, marks: null) when a parent has shared stem text.
Do NOT create intermediate parent rows with empty question_text — put stem text on the nearest ancestor that has content.`
}

export function buildChunkExtractionPrompt(
  meta: ExtractionPromptMeta,
  chunk: {
    startPage: number
    endPage: number
    totalPages: number
    chunkIndex: number
    chunkCount: number
  }
): string {
  return `${buildQuestionPaperExtractionPrompt(meta)}

CHUNK CONTEXT (critical):
- This PDF chunk is pages ${chunk.startPage}–${chunk.endPage} of ${chunk.totalPages} total (chunk ${chunk.chunkIndex + 1}/${chunk.chunkCount}).
- Extract every question and sub-part whose content appears on pages ${chunk.startPage}–${chunk.endPage}, including sub-parts of questions that started on earlier pages.
- source_page_numbers must use FULL-DOCUMENT page numbers (${chunk.startPage}–${chunk.endPage}), not chunk-local 1-based indices.
- If a question spans this chunk boundary, include ALL sub-parts visible here even if the parent stem was on an earlier page.
- Do not skip sub-parts because you think another chunk handled them.`
}

export const DIAGRAM_REGION_PROMPT = `Identify every diagram, graph, circuit, or apparatus figure on this exam page image.
Exclude text-only content, page headers, and footers.

Return ONLY JSON:
{
  "diagrams": [
    {
      "label": "Fig. 4.2",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "caption": "optional caption text"
    }
  ]
}

Coordinates are normalized fractions of page dimensions (0.0–1.0), origin top-left.
Include the full figure including axis labels and arrows.`

export const DIAGRAM_COMPLETENESS_PROMPT = `Does this cropped image show a complete exam figure (diagram, graph, or apparatus)?
A complete figure includes axis labels, arrows, and captions that belong to the figure — not cut off mid-way.

Return ONLY JSON: { "complete": boolean, "reason": string }`

export const DIAGRAM_DESCRIPTION_PROMPT = `Describe this exam diagram for accessibility alt-text.
Include what physical setup or graph is shown, axis labels, and key features.
Return ONLY JSON: { "description": string, "caption": string }`
