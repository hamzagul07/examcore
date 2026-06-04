export type FaqItem = { q: string; a: string }

const SKIP_HEADINGS =
  /^(frequently asked|bottom line|what to read|who this|what you need|why |table of contents|references|sources)/i

/** Pull ### questions under ## Frequently asked questions */
export function extractFaqFromMarkdown(content: string): FaqItem[] {
  const lines = content.split('\n')
  let inFaq = false
  const items: FaqItem[] = []
  let currentQ = ''
  let currentA: string[] = []

  const flush = () => {
    if (currentQ && currentA.length) {
      items.push({ q: currentQ, a: currentA.join(' ').trim() })
    }
    currentQ = ''
    currentA = []
  }

  for (const line of lines) {
    if (/^##\s+frequently asked/i.test(line)) {
      inFaq = true
      continue
    }
    if (inFaq && /^##\s+/.test(line) && !/^###/.test(line)) {
      flush()
      break
    }
    if (!inFaq) continue
    if (/^###\s+/.test(line)) {
      flush()
      currentQ = line.replace(/^###\s+/, '').trim()
      continue
    }
    if (currentQ && line.trim()) {
      currentA.push(line.replace(/\*\*/g, '').trim())
    }
  }
  flush()
  return items
}

/** H2 sections as HowTo steps (how-to / workflow posts). */
export function extractHowToSteps(
  content: string,
  maxSteps = 8
): { name: string; text: string }[] {
  const lines = content.split('\n')
  const steps: { name: string; text: string }[] = []
  let name = ''
  let body: string[] = []

  const flush = () => {
    if (name && body.length && !SKIP_HEADINGS.test(name)) {
      steps.push({ name, text: body.join(' ').slice(0, 500) })
    }
    name = ''
    body = []
  }

  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      flush()
      name = line.replace(/^##\s+/, '').replace(/\*\*/g, '').trim()
      continue
    }
    if (name && line.trim() && !line.startsWith('```')) {
      body.push(line.replace(/\*\*/g, '').trim())
    }
  }
  flush()
  return steps.slice(0, maxSteps)
}

/** Comparison tables: first column of markdown tables after a heading. */
export function extractComparisonItems(content: string): string[] {
  const items: string[] = []
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue
    if (/^\|[\s-:|]+\|$/.test(line)) continue
    const cols = line.split('|').map((c) => c.trim()).filter(Boolean)
    if (cols.length && !/^resource$/i.test(cols[0]) && !/^tier$/i.test(cols[0])) {
      items.push(cols[0].replace(/^\d+\.\s*/, ''))
    }
  }
  return [...new Set(items)].slice(0, 12)
}

/** First paragraph after frontmatter — AEO direct answer. */
export type SerpSnippet = { question: string; answer: string }

/** 40–60 word answers under ### headings (featured snippet / PAA targets). */
export function extractSerpSnippets(content: string, max = 6): SerpSnippet[] {
  const lines = content.split('\n')
  const snippets: SerpSnippet[] = []
  let question = ''
  let body: string[] = []
  let inFaq = false

  const flush = () => {
    if (!question) return
    const answer = body.join(' ').replace(/\*\*/g, '').trim()
    const words = answer.split(/\s+/).filter(Boolean)
    if (words.length < 8) return
    const trimmed =
      words.length > 60 ? words.slice(0, 58).join(' ') + '…' : answer
    snippets.push({ question, answer: trimmed })
    question = ''
    body = []
  }

  for (const line of lines) {
    if (/^##\s+frequently asked/i.test(line)) {
      flush()
      inFaq = true
      continue
    }
    if (inFaq && /^##\s+/.test(line) && !/^###/.test(line)) {
      inFaq = false
    }
    if (inFaq) continue
    if (/^###\s+/.test(line)) {
      flush()
      question = line.replace(/^###\s+/, '').trim()
      if (!question.endsWith('?')) question += '?'
      continue
    }
    if (question && line.trim() && !line.startsWith('|') && !line.startsWith('```')) {
      body.push(line.replace(/\*\*/g, '').trim())
      if (body.join(' ').split(/\s+/).length >= 45) flush()
    }
  }
  flush()
  return snippets.slice(0, max)
}

export function extractLeadParagraph(content: string): string {
  const para = content
    .split('\n\n')
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('---') && !p.startsWith('|'))
  return para?.replace(/\*\*/g, '').slice(0, 320) ?? ''
}
