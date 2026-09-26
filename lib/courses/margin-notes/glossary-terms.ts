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

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The words right after the term read as a definition ("… is", "… refers to", "(…)"). */
const DEFINING_CUE =
  /^\s*[,)]?\s*(?:\(|—|–|:|is\b|are\b|refers\b|means\b|describes\b|measures\b|states\b|occurs\b|,\s*(?:which|the|a|an)\b)/i
/** The next sentence carries the definition ("… (e.m.f.). This is the total energy …"). */
const NEXT_SENTENCE_DEFINES = /^(?:This|It|These|They|That)\b(?!\s+(?:lesson|topic|pilot|section|chapter))/

/** Lines of a section as prose blocks: list markers stripped, numbered steps flagged. */
function blocks(content: string): Array<{ text: string; step: boolean }> {
  return content
    .split(/\n+/)
    .map((line) => {
      const step = /^\s*\d+[.)]\s+/.test(line)
      const text = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()
      return { text, step }
    })
    .filter((b) => b.text)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function glossaryFromBoldTerms(lesson: Pick<CourseLesson, 'sections'>): GlossaryEntry[] {
  const seen = new Set<string>()
  const usedDefinitions = new Set<string>()
  const entries: GlossaryEntry[] = []
  for (const section of lesson.sections) {
    // The intro bolds the topic's headline words as a welcome, not as terms.
    if (section.type !== 'text') continue
    for (const block of blocks(section.content)) {
      // "1. **Plot error bars:** …" — a numbered list is a procedure, not a glossary.
      if (block.step) continue
      const sents = sentences(block.text)
      for (let i = 0; i < sents.length && entries.length < MAX_TERMS; i++) {
        const sentence = plain(sents[i]!)
        for (const m of sents[i]!.matchAll(/\*\*([^*]{2,})\*\*/g)) {
          const term = plain(m[1]!).replace(/[.,;:]+$/, '')
          if (!term || term.length > MAX_TERM_LENGTH) continue
          // A bolded sentence, command, code, formula or pairing is emphasis, not a term.
          if (/[.!?]$/.test(term) || /^[\d.]+$/.test(term) || term.includes('$')) continue
          if (term.split(' ').length > 6 || /\b(?:and|but|nor|or)\b/.test(term)) continue
          const key = term.toLowerCase()
          if (seen.has(key)) continue
          const at = sentence.search(new RegExp(escapeRe(term), 'i'))
          if (at < 0) continue
          const after = sentence.slice(at + term.length)
          const next = sents[i + 1] ? plain(sents[i + 1]!) : ''
          let definition: string | null = null
          const labelled = /^\s*[:—–]\s*(\S.*)$/.exec(after)
          if (labelled) {
            // "**Electrolytes:** In liquids …" — the rest of the line is the definition.
            definition = capitalise(labelled[1]!)
            if (definition.length < 60 && next) definition = `${definition} ${next}`
          } else if (DEFINING_CUE.test(after)) {
            // A term inside a labelled item ("Semiconductors: … **holes** (…)") is
            // defined by the item's body, not by its label.
            definition = capitalise(sentence.replace(/^[^:.]{1,48}:\s+(?=\S)/, ''))
            if (definition.length < 60 && next) definition = `${definition} ${next}`
          } else if (next && NEXT_SENTENCE_DEFINES.test(next)) {
            definition = `${sentence} ${next}`
          }
          if (!definition || usedDefinitions.has(definition)) continue
          seen.add(key)
          usedDefinitions.add(definition)
          entries.push({ t: term, d: definition })
          if (entries.length >= MAX_TERMS) break
        }
      }
    }
  }
  return entries
}
