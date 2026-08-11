/**
 * What the internal assessment is actually called, per subject.
 *
 * Only entries our own published guides state explicitly. Everything else falls
 * back to "IA", which is what students call it anyway — being generic is
 * recoverable, being wrong in front of an IB student is not.
 *
 * Shared so the thread seeder and the campaign cannot drift into calling the
 * same thing two different names in the same week.
 */
const IA_NAME: Record<string, string> = {
  'maths-aa': 'Exploration',
  'maths-ai': 'Exploration',
  chemistry: 'scientific investigation',
  biology: 'scientific investigation',
  physics: 'scientific investigation',
  economics: 'commentary',
}

/** Core components have no IA at all — the EE is a research essay, TOK an essay. */
export const CORE_COMPONENTS = new Set(['extended-essay', 'tok', 'cas'])

/** Strip the level so maths-aa-hl and maths-aa-sl share one entry. */
export function subjectBase(slug: string): string {
  return slug.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
}

export function iaName(subjectSlug: string): string {
  return IA_NAME[subjectBase(subjectSlug)] ?? 'IA'
}

/** "an Exploration", "a commentary" — the fallback starts with a vowel sound. */
export function iaArticle(name: string): string {
  return /^[aeiou]/i.test(name) ? 'an' : 'a'
}

/**
 * What students call the subject, for places with no room for the full name.
 *
 * "Mathematics: Analysis and Approaches HL" is the official title and nobody
 * says it. It also carries a colon, so dropping it into a subject line built
 * with a colon produces "Mathematics: Analysis and Approaches HL: is your…",
 * and at 89 characters it is truncated in most inboxes anyway.
 */
export function shortIbLabel(name: string, level: string): string {
  const short = name
    .replace('Mathematics: Analysis and Approaches', 'Maths AA')
    .replace('Mathematics: Applications and Interpretation', 'Maths AI')
    .replace('English A: Language and Literature', 'English Lang Lit')
    .replace('English A: Literature', 'English Lit')
    .replace('Environmental Systems and Societies', 'ESS')
    .replace('Business Management', 'Business')
    .replace('Computer Science', 'Comp Sci')
  return `${short} ${level}`
}
