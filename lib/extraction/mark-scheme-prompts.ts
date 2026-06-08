import { MATH_NOTATION_BLOCK } from '@/lib/marking/extraction-prompts'
import type { ParsedPaperMeta } from './paper-meta'

export function buildMarkSchemeExtractionPrompt(meta: ParsedPaperMeta): string {
  return `You are extracting marking points from a Cambridge ${meta.subjectCode} mark scheme PDF.
Paper ${meta.paperNumber}, variant ${meta.variant}, ${meta.session} ${meta.year}.

Extract EVERY question and sub-part (1, 1(a), 1(a)(i), 2(b)(ii), etc.) with all bulleted marking points underneath.

RULES:
- Each awardable bullet is ONE marking point. "Correct substitution AND correct answer with units [2]" is ONE point with marks_awarded: 2 — NOT two rows.
- Explicit sub-bullets each with their own [N] are separate marking points.
- OR-separated acceptable answers are ONE point (marks_awarded: 1) with alternatives in alternative_phrasings — NOT separate additive rows.
- The total marks_awarded across all points for a question part MUST equal the part's mark allocation [N] shown in the MS header/subtotal. Do not list every B1 wording variant as a separate mark.
- Lines like "[Total: 6]", "Question total: 8 marks", or section sub-totals are NOT marking points. Put them in question_subtotal only (validation).
- Skip generic marking principles pages and blank pages.
- Preserve Cambridge examiner notation in examiner_notes or alternative_phrasings — do NOT strip:
  ecf (error carried forward), owtte (or words to that effect), cao (correct answer only),
  OR / ; separators for alternative answers, Allow [X], Do not allow [X].
- marks_awarded: integer or 0.5 for [½]. Parse [2], [1], [½] from each bullet.
- question_number: lowercase letters and roman numerals, e.g. "4(b)(ii)" — no spaces.

${MATH_NOTATION_BLOCK}

Output ONLY valid JSON (no markdown fences):
{
  "page_count": number,
  "paper_total": number,
  "entries": [
    {
      "question_number": "1(a)(i)",
      "question_subtotal": 2,
      "source_page_numbers": [2],
      "marking_points": [
        {
          "point_text": "correct substitution into $F = ma$",
          "marks_awarded": 1,
          "examiner_notes": "ecf",
          "alternative_phrasings": ["allow 2 sf", "OR equivalent expression"],
          "is_subtotal": false
        }
      ]
    }
  ]
}

Include entries even when a question has only one combined marking point.
Do not invent marking points not present in the PDF.`
}

export function buildMarkSchemeChunkPrompt(
  meta: ParsedPaperMeta,
  chunk: {
    startPage: number
    endPage: number
    totalPages: number
    chunkIndex: number
    chunkCount: number
  }
): string {
  return `${buildMarkSchemeExtractionPrompt(meta)}

CHUNK CONTEXT:
- This PDF chunk is pages ${chunk.startPage}–${chunk.endPage} of ${chunk.totalPages} (chunk ${chunk.chunkIndex + 1}/${chunk.chunkCount}).
- Extract every question header and marking point visible on pages ${chunk.startPage}–${chunk.endPage}.
- source_page_numbers must use full-document page numbers.
- Do not skip sub-parts because another chunk may have handled them — extract all content visible here.`
}
