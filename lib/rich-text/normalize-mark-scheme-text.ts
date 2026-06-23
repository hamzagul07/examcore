import { normalizeMarkingText } from '@/lib/rich-text/normalize-marking-text'

/**
 * Mark scheme rows in the DB often lack `$...$` delimiters (legacy extraction).
 * Wrap obvious bare math before RichTextRenderer / KaTeX — conservative patterns
 * only; false positives in English prose are worse than under-wrapping.
 */
const STASH = '\x00S'

export function normalizeMarkSchemeText(text: string): string {
  if (!text) return text

  const stashed: string[] = []
  const stash = (latex: string) => {
    stashed.push(latex)
    return `${STASH}${stashed.length - 1}\x00`
  }

  let out = text

  // Preserve existing delimited math.
  out = out.replace(/\$\$[\s\S]+?\$\$/g, (m) => stash(m))
  out = out.replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (m) => stash(m))

  // Combinations: C(6,2)=20
  out = out.replace(
    /\bC\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*(\d+)/g,
    (_m, n, r, k) => stash(`$\\binom{${n}}{${r}} = ${k}$`)
  )

  // Equations with implicit multiplication: 240 = 12 x 80a^2
  out = out.replace(
    /(\d+(?:\.\d+)?)\s*=\s*((?:\d+(?:\.\d+)?\s*[x×]\s*)+\d+(?:\.\d+)?[A-Za-z]?(?:\^\{[^}]+\}|\^\d+)?)/g,
    (_m, lhs, rhs) => {
      const latex = rhs.replace(/\s*[x×]\s*/g, ' \\times ')
      return stash(`$${lhs} = ${latex}$`)
    }
  )

  // Variable = decimal: a = 0.5
  out = out.replace(
    /\b([A-Za-z])\s*=\s*(\d+(?:\.\d+)?)\b/g,
    (_m, v, n) => stash(`$${v} = ${n}$`)
  )

  // Variable = fraction: a = (1/2) — handled after standalone (1/2) if needed
  out = out.replace(
    /\b([A-Za-z])\s*=\s*\((\d+)\/(\d+)\)/g,
    (_m, v, a, b) => stash(`$${v} = \\frac{${a}}{${b}}$`)
  )

  // Condone +/- 0.5
  out = out.replace(
    /\+\s*\/\s*-\s*(\d+(?:\.\d+)?)/g,
    (_m, n) => stash(`$\\pm ${n}$`)
  )

  // Parenthesised powers: (1-4x)^6, (-4)^2, (2+ax)^5
  out = out.replace(
    /\(([^()\n]{1,80})\)\^(\{[^}]+\}|\d+)/g,
    (_m, base, exp) => {
      if (!/[A-Za-z0-9+\-*/=]/.test(base)) return `(${base})^${exp}`
      return stash(`$(${base})^${exp}$`)
    }
  )

  // Coefficient + variable exponent: 80a^2, 240x^2
  out = out.replace(
    /(?<![A-Za-z$])(\d+[A-Za-z])\^(\{[^}]+\}|\d+)/g,
    (_m, base, exp) => stash(`$${base}^${exp}$`)
  )

  // Single-variable exponent: x^2
  out = out.replace(
    /(?<![A-Za-z\\$])([A-Za-z])\^(\{[^}]+\}|\d+)/g,
    (_m, base, exp) => stash(`$${base}^${exp}$`)
  )

  // Standalone fraction in parentheses: (1/2)
  out = out.replace(
    /\((\d+)\/(\d+)\)/g,
    (_m, a, b) => stash(`$\\frac{${a}}{${b}}$`)
  )

  // nCr shorthand
  out = out.replace(/\bnCr\b/g, () => stash('$_{n}C_{r}$'))

  out = out.replace(
    new RegExp(`${STASH}(\\d+)\\x00`, 'g'),
    (_m, i: string) => stashed[parseInt(i, 10)]
  )

  return normalizeMarkingText(out)
}
