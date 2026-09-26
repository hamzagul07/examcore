import type { CourseLesson } from '@/lib/courses/types'

/**
 * A glossary from the lesson's own emphasis.
 *
 * Lessons without an authored key-terms block used to fall back to their
 * flashcards, with each card's question cut at 40 characters standing in as
 * the "term" — so the glossary read "What are 'lost volts' in", "State
 * Kirchhoff's First", "Under what condition is". Not a glossary.
 *
 * Authors do mark the terms, though: they bold them the first time they
 * appear ("has an **electromotive force (e.m.f., ε)**. This is the total…").
 * That sentence, and the one after it when the term ends the sentence, is
 * the definition a textbook would print in the margin.
 */
export type GlossaryEntry = { t: string; d: string }

const MAX_TERMS = 12
const MAX_TERM_LENGTH = 48

function plain(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split prose into sentences, keeping abbreviations such as e.m.f. and p.d. whole. */
function sentences(text: string): string[] {
  const out: string[] = []
  let start = 0
  const re = /[.!?](?=\s+[A-Z(])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const end = m.index + 1
    const before = text.slice(start, end)
    // "e.m.f. This" — a dot inside an abbreviation is not a stop.
    if (/(?:^|[\s(])(?:[A-Za-z](?:\.[A-Za-z])+)\.$/.test(before)) continue
    out.push(before.trim())
    start = end
  }
  const tail = text.slice(start).trim()
  if (tail) out.push(tail)
  return out
}

export function glossaryFromBoldTerms(lesson: Pick<CourseLesson, 'sections'>): GlossaryEntry[] {
  const seen = new Set<string>()
  const entries: GlossaryEntry[] = []
  for (const section of lesson.sections) {
    if (section.type !== 'text' && section.type !== 'intro') continue
    const sents = sentences(section.content.replace(/\s+/g, ' ').trim())
    for (let i = 0; i < sents.length && entries.length < MAX_TERMS; i++) {
      const sentence = sents[i]!
      for (const m of sentence.matchAll(/\*\*([^*]{2,})\*\*/g)) {
        const term = plain(m[1]!).replace(/[.,;:]+$/, '')
        if (!term || term.length > MAX_TERM_LENGTH) continue
        // A bolded sentence or command ("Let's get started!") is emphasis, not a term.
        if (/[.!?]$/.test(term) || term.split(' ').length > 6) continue
        const key = term.toLowerCase()
        if (seen.has(key)) continue
        let definition = plain(sentence)
        // "…has an electromotive force (e.m.f., ε). This is the total energy…"
        // — the sentence that names the term says nothing yet; take the next.
        const endsWithTerm = new RegExp(`${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[.!?]?$`, 'i').test(definition)
        if ((endsWithTerm || definition.length < 60) && sents[i + 1]) {
          definition = `${definition} ${plain(sents[i + 1]!)}`
        }
        seen.add(key)
        entries.push({ t: term, d: definition })
        if (entries.length >= MAX_TERMS) break
      }
    }
  }
  return entries
}
