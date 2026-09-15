/**
 * Profile subject code → `ib_subject.code`.
 *
 * Several IB subjects share one catalogue entry because the IB publishes one
 * guide for all of them: every Language B language is assessed against the same
 * criteria, so the catalogue stores `ib-language-b` once rather than a row per
 * language. The marking profiles, which exist to name a subject to a student,
 * are per language — `ib-french-b-sl`, `ib-spanish-b-hl`.
 *
 * Nothing bridged the two on the marking path. `resolvePracticeIb` split
 * `ib-french-b-sl` into `ib-french-b` + `SL` and asked the catalogue for that
 * subject, which does not exist, so the lookup returned null and marking fell
 * back to a holistic band — even when the student had picked a component.
 *
 * The cost of that was measured on 2026-09-14: an IB French B Paper 1 diary
 * entry was marked as one holistic judgment out of 12 and returned 1/12 for
 * work worth 8. The catalogue has held `ib-language-b/paper_1` the whole time —
 * assessment_model `criteria`, 30 marks, criteria A:12 B:12 C:6, with verbatim
 * band descriptors and source page references in `ib_criterion_band`.
 *
 * The same mapping already existed in lib/courses/criterion-ladder.ts, where it
 * powers the criterion ladder on lesson pages. It lives here now so the two
 * surfaces cannot drift: a subject whose ladder a student can read should be a
 * subject their answer can be marked against.
 */

/**
 * Only subjects with rows in `ib_subject`. A mapping to a code the catalogue
 * does not hold is worse than no mapping — it looks wired and resolves to
 * nothing, which is exactly the failure this file exists to end.
 */
const CATALOG_SUBJECT_CODE: Record<string, string> = {
  // Every Language B language shares one guide and one set of criteria.
  'ib-french-b': 'ib-language-b',
  'ib-spanish-b': 'ib-language-b',
  // The profile spells the group out; the catalogue abbreviates it.
  'ib-english-a-lang-lit': 'ib-lang-a-langlit',
}

/**
 * The catalogue subject code to look up for a profile subject code.
 *
 * Identity when no mapping is needed, so callers can apply it unconditionally
 * — `ib-psychology` is `ib-psychology` in both places, and a caller should not
 * have to know which subjects are special.
 */
export function catalogSubjectCode(profileSubjectCode: string): string {
  const code = profileSubjectCode.trim().toLowerCase()
  return CATALOG_SUBJECT_CODE[code] ?? code
}

/** True when the profile code names a subject the catalogue stores elsewhere. */
export function isAliasedCatalogSubject(profileSubjectCode: string): boolean {
  return profileSubjectCode.trim().toLowerCase() in CATALOG_SUBJECT_CODE
}

/**
 * Components whose catalogued "criteria" are per-question slots, not assessment
 * criteria — so they must never supply the rubric for a single practice answer.
 *
 * `assessment_model = 'criteria'` is not the test. Reading the criterion NAMES
 * is:
 *
 *   psychology paper_1   "Paper 1 Section A: question 1" (4)
 *                        "Paper 1 Section A: question 2" (4)
 *                        "Paper 1 Section C" (15)
 *   economics  paper_1   "Part (a) 10-mark question" (10)
 *                        "Part (b) 15-mark question" (15)
 *
 * Each row is a question on the paper. A student practising one essay against
 * that rubric is marked out of the whole paper and judged for the questions
 * they were never asked — production already shows Economics practice answers
 * marked out of 25, the sum of both parts.
 *
 * Their real criteria — Diagrams, Terminology, Evaluation; Introduction,
 * Research methodology, Discussion — live on the IA components, which a practice
 * upload is not. Until a single practice answer can be tied to one slot, the
 * holistic profile fallback is closer to right than a rubric for a paper the
 * student did not sit.
 *
 * Every criterion name across all 17 catalogued subjects was read to build this
 * list, and the split does not follow component type. It is broadly true that
 * IA and portfolio components carry real criteria while exam papers carry
 * slots — but Business Management's HL paper 3 is genuinely criteria-marked
 * (Use of resource materials, Tools and theories, Evaluation, Sequencing of
 * ideas), and Language B and Lang-Lit's papers are too. A blanket rule on
 * `paper_*` would have blocked all three. There is no shortcut here: adding a
 * subject means reading its criterion names.
 *
 * Keyed by catalogue subject code, so it is checked after `catalogSubjectCode`.
 */
const PER_QUESTION_SLOT_COMPONENTS: Record<string, readonly string[]> = {
  'ib-psychology': ['paper_1', 'paper_2', 'paper_3'],
  'ib-economics': ['paper_1', 'paper_2'],
  // "Section A—Core theme" (25), "Section B—Optional themes (first essay)" (25),
  // "(second essay)" (25). Paper 1 HL is three essays; a student practising one
  // has no business being marked out of 75.
  'ib-philosophy': ['paper_1', 'paper_2', 'paper_3'],
  // "Paper 3 HL part a" (12), "Paper 3 HL part b" (16).
  'ib-geography': ['paper_3'],
}

/**
 * True when this component's criteria describe a whole paper's questions rather
 * than the dimensions of one answer.
 *
 * Takes the catalogue subject code (post-mapping), because that is the level at
 * which the catalogue stores components.
 */
export function componentIsPerQuestionSlots(
  catalogSubject: string,
  componentKey: string
): boolean {
  const subject = catalogSubject.trim().toLowerCase()
  const key = componentKey.trim().toLowerCase()
  return (PER_QUESTION_SLOT_COMPONENTS[subject] ?? []).includes(key)
}
