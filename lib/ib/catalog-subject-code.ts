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
