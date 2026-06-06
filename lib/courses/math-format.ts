/** Prepare course text for KaTeX / remark-math rendering. */
export function prepareCourseMath(text: string): string {
  let s = text.trim()

  // Already has math delimiters
  if (/\$[^$]+\$/.test(s)) return s

  // Common symbols
  s = s.replace(/Δ/g, '\\Delta ')
  s = s.replace(/±/g, '\\pm ')
  s = s.replace(/×/g, '\\times ')
  s = s.replace(/÷/g, '\\div ')
  s = s.replace(/π/g, '\\pi ')
  s = s.replace(/√/g, '\\sqrt')
  s = s.replace(/ⁿ/g, '^n')
  s = s.replace(/⁻/g, '-')
  s = s.replace(/³/g, '^3')
  s = s.replace(/²/g, '^2')

  // Fraction lines like "I = Q / t"
  if (/=\s*[^=]+\s*\/\s*[^=]+/.test(s) && !s.includes('\n')) {
    const parts = s.split('=')
    if (parts.length === 2) {
      const lhs = parts[0].trim()
      const rhs = parts[1].trim()
      const frac = rhs.split('/').map((x) => x.trim())
      if (frac.length === 2) {
        return `$${lhs} = \\frac{${frac[0]}}{${frac[1]}}$`
      }
    }
  }

  // Multi-line formula blocks → display math
  if (s.includes('\n') && (/\\Delta|frac|=/.test(s))) {
    return `$$\n${s}\n$$`
  }

  // Single-line with math symbols
  if (/\\Delta|\\pm|\\times|\\frac|=/.test(s)) {
    return `$${s}$`
  }

  return s
}

/** Multi-line formula / rules blocks for markdown + KaTeX. */
export function prepareCourseMathMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      if (t.startsWith('•') || t.startsWith('-')) return t
      if (t.includes('$')) return t
      if (/=/.test(t) || /\\Delta/.test(t)) return prepareCourseMath(t)
      return t
        .replace(/Δ/g, '$\\Delta$')
        .replace(/±/g, '$\\pm$')
        .replace(/×/g, '$\\times$')
    })
    .join('\n\n')
}
