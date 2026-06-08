const COMMAND_WORDS = [
  'define',
  'state',
  'describe',
  'explain',
  'suggest',
  'calculate',
  'determine',
  'show',
  'derive',
  'sketch',
  'compare',
  'evaluate',
  'discuss',
  'deduce',
  'recall',
  'understand',
  'use',
  'apply',
  'analyse',
  'analyze',
  'recognise',
  'recognize',
]

export function buildSyllabusExtractionPrompt(
  subjectCode: string,
  subjectName: string
): string {
  return `You are extracting fine-grained learning objectives from the official Cambridge International ${subjectName} (${subjectCode}) syllabus PDF.

Extract EVERY assessable specification bullet at the finest numbered grain Cambridge prints — e.g. 14.3.1, 14.3.2, 14.3.3 under topic 14.3 — NOT just topic headings (14.3 alone is insufficient).

RULES:
- Each bullet / learning outcome = one objective row with a unique objective_number.
- topic_code = parent sub-topic (e.g. "14.3" for bullets 14.3.1, 14.3.2).
- topic_title = title of that sub-topic section from the syllabus.
- objective_text = full verbatim bullet text (wrap math in $...$ LaTeX).
- command_words = array of command words detected at the start of the bullet (${COMMAND_WORDS.join(', ')}, etc.).
- examined_in_papers = which exam papers assess this objective. Use paper NUMBERS as strings: "1", "2", "3", "4", "5".
  * Infer from inline text ("Papers 1, 2, 4"), table columns, or section headers (AS content → papers 1-3, A Level extension → paper 4, etc.).
  * AS-only topics: typically ["1","2","3"]. A Level topics: include "4" where applicable.
  * Every objective MUST have at least one paper — never leave examined_in_papers empty.
- syllabus_year = specification version year from the cover (e.g. 2024 for "for examination from 2024").
- Skip administrative pages, command-word glossaries, and assessment overview prose without numbered objectives.

Output ONLY valid JSON (no markdown fences):
{
  "syllabus_year": 2024,
  "subject_name": "${subjectName}",
  "objectives": [
    {
      "topic_code": "14.3",
      "topic_title": "Specific heat capacity and specific latent heat",
      "objective_number": "14.3.1",
      "objective_text": "define specific heat capacity and specific latent heat",
      "command_words": ["define"],
      "examined_in_papers": ["4"]
    }
  ]
}

Target 130–200+ objectives for 9702 Physics. Do not collapse multiple bullets into one row.`
}

export function buildSyllabusChunkPrompt(
  subjectCode: string,
  subjectName: string,
  chunk: {
    startPage: number
    endPage: number
    totalPages: number
    chunkIndex: number
    chunkCount: number
  }
): string {
  return `${buildSyllabusExtractionPrompt(subjectCode, subjectName)}

CHUNK CONTEXT:
- PDF pages ${chunk.startPage}–${chunk.endPage} of ${chunk.totalPages} (chunk ${chunk.chunkIndex + 1}/${chunk.chunkCount}).
- Extract all objectives whose content appears on these pages.
- Use full-document page numbers in any page references.`
}
