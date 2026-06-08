const MAX_PILL = 24

function isTruncatedQuestionLabel(label: string): boolean {
  const t = label.trim()
  if (!t) return true
  if (/^(what|how|why|when|where|which|define|state|explain|calculate|describe)\b/i.test(t)) {
    return true
  }
  if (/\b(the|a|an|of|for|from|to|in|on|at|and|or)\s*$/i.test(t)) return true
  return false
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const words = text.split(/\s+/)
  let out = ''
  for (const w of words) {
    const next = out ? `${out} ${w}` : w
    if (next.length > max) break
    out = next
  }
  return out || words[0]?.slice(0, max) || text.slice(0, max)
}

type LabelRule = { re: RegExp; label: string | ((m: RegExpMatchArray) => string) }

const RULES: LabelRule[] = [
  {
    re: /formula for calculating linear momentum|fundamental definition and formula for momentum/i,
    label: 'Momentum formula',
  },
  {
    re: /what condition must be met for an object to reach terminal velocity/i,
    label: 'Terminal velocity',
  },
  {
    re: /what does the principle of conservation of momentum state/i,
    label: 'Conservation principle',
  },
  {
    re: /how does mass differ from weight/i,
    label: 'Mass vs weight',
  },
  {
    re: /what is another name for newton's first law/i,
    label: "Newton's First Law",
  },
  {
    re: /state newton's third law/i,
    label: "Newton's Third Law",
  },
  {
    re: /key difference between elastic and inelastic/i,
    label: 'Elastic vs inelastic',
  },
  {
    re: /how does newton's second law relate force/i,
    label: 'Force & momentum',
  },
  {
    re: /standard units of momentum/i,
    label: 'Momentum units',
  },
  {
    re: /relative speed in a perfectly elastic/i,
    label: 'Elastic collision',
  },
  {
    re: /scalar or vector/i,
    label: 'Scalar or vector?',
  },
  {
    re: /how does force relate.*momentum/i,
    label: 'Force & momentum',
  },
  {
    re: /when is the total momentum.*conserved/i,
    label: 'Conservation conditions',
  },
  {
    re: /difference between an elastic and an inelastic/i,
    label: 'Elastic vs inelastic',
  },
  {
    re: /kinetic energy.*inelastic/i,
    label: 'KE in inelastic',
  },
  {
    re: /perfectly elastic collision.*conserved/i,
    label: 'Elastic — conserved',
  },
  {
    re: /closed system/i,
    label: 'Closed system',
  },
  {
    re: /always conserved in both elastic/i,
    label: 'Always conserved',
  },
  {
    re: /can sound waves undergo polarisation/i,
    label: 'Sound polarisation',
  },
  {
    re: /gradient of a displacement[- ]time graph/i,
    label: 's–t gradient',
  },
  {
    re: /area under a velocity[- ]time graph/i,
    label: 'v–t area',
  },
  {
    re: /gradient of a velocity[- ]time graph/i,
    label: 'v–t gradient',
  },
  {
    re: /what is the si unit for absolute temperature/i,
    label: 'Kelvin scale',
  },
  {
    re: /convert a temperature from celsius to kelvin/i,
    label: 'K = C + 273.15',
  },
  {
    re: /absolute zero in degrees celsius/i,
    label: 'Absolute zero',
  },
  {
    re: /defines the kelvin scale as an .?absolute/i,
    label: 'Absolute scale',
  },
  {
    re: /kelvin scale often preferred/i,
    label: 'Why Kelvin?',
  },
  {
    re: /two fixed points of the celsius/i,
    label: 'Celsius scale',
  },
  {
    re: /change of 1 kelvin relate/i,
    label: 'ΔK = Δ°C',
  },
  {
    re: /name two physical properties.*thermometry/i,
    label: 'Thermometry',
  },
  {
    re: /theoretical state of particles at absolute zero/i,
    label: 'At absolute zero',
  },
  {
    re: /define specific heat capacity/i,
    label: 'Specific heat capacity',
  },
  {
    re: /define specific latent heat/i,
    label: 'Specific latent heat',
  },
  {
    re: /define wavelength/i,
    label: 'Wavelength',
  },
  {
    re: /define.*polarisation/i,
    label: 'Polarisation',
  },
  {
    re: /how is the period.*related/i,
    label: 'Period & frequency',
  },
  {
    re: /relationship between.*speed.*frequency/i,
    label: 'Wave equation',
  },
  {
    re: /malus/i,
    label: "Malus' Law",
  },
  {
    re: /name two examples of transverse/i,
    label: 'Wave examples',
  },
  {
    re: /what is the formula/i,
    label: (m) =>
      truncateAtWord(
        m[0].replace(/what is the formula (?:used to|for)\s+/i, '').replace(/\?.*$/, ''),
        MAX_PILL
      ),
  },
  {
    re: /^define\s+(.+?)\.?$/i,
    label: (m) => truncateAtWord(m[1].trim(), MAX_PILL),
  },
  {
    re: /^what is (?:the\s+)?(.+?)\?*$/i,
    label: (m) => truncateAtWord(m[1].trim(), MAX_PILL),
  },
  {
    re: /^how does\s+(.+?)\?/i,
    label: (m) => truncateAtWord(m[1].trim(), MAX_PILL),
  },
  {
    re: /^why\s+(.+?)\?/i,
    label: (m) => truncateAtWord(m[1].trim(), MAX_PILL),
  },
  {
    re: /^when\s+(.+?)\?/i,
    label: (m) => truncateAtWord(m[1].trim(), MAX_PILL),
  },
]

function labelFromBack(back: string): string | null {
  const first = back.trim().split(/[.,]/)[0]
  const isMatch = first.match(/^([A-Za-z][A-Za-z\s\-']+?)\s+is\s+(?:a|an|the)\s+/i)
  if (isMatch?.[1] && isMatch[1].length <= MAX_PILL) {
    return isMatch[1].trim()
  }
  return null
}

/** Short pill label (max 24 chars, word boundary) — never a truncated question */
export function glossaryLabelFromFlashcard(
  front: string,
  back?: string,
  pillLabel?: string
): string {
  if (pillLabel?.trim() && !isTruncatedQuestionLabel(pillLabel)) {
    return truncateAtWord(pillLabel.trim(), MAX_PILL)
  }

  const q = front.trim()
  for (const rule of RULES) {
    const m = q.match(rule.re)
    if (m) {
      const label = typeof rule.label === 'function' ? rule.label(m) : rule.label
      return truncateAtWord(label, MAX_PILL)
    }
  }

  if (back) {
    const fromBack = labelFromBack(back)
    if (fromBack) return fromBack
  }

  const stripped = q.replace(/\?+$/, '').trim()
  if (stripped.length <= MAX_PILL) return stripped

  return truncateAtWord(stripped, MAX_PILL)
}

/** Minimum 6-word complete question for quick-check panels. */
export function ensureFullQuickCheckPrompt(prompt: string): string {
  let p = prompt.trim()
  if (!p.endsWith('?')) p = `${p}?`
  const words = p.replace(/\?+$/, '').split(/\s+/).filter(Boolean)
  if (words.length >= 6) return p
  const core = p.replace(/\?+$/, '').trim()
  if (/^(what|why|how|define|state|explain|calculate|describe)/i.test(core)) {
    return `Explain or define: ${core}?`
  }
  return `Define or explain: ${core}?`
}

export function quickCheckPromptFromKeyPoint(text: string, index: number): string {
  const t = text.trim()
  if (t.length < 90 && (t.endsWith('?') || /^(what|why|how|define|state|explain|calculate)/i.test(t))) {
    return t.endsWith('?') ? t : `${t}?`
  }
  const first = t.split(/[.!]/)[0].trim()
  if (first.length < 80) {
    return `Can you explain: ${first}?`
  }
  return `Key point ${index + 1}: what do you remember about this idea?`
}
