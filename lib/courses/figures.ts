/**
 * Lesson figures — generated visuals that are *authored as data*, not as bespoke
 * SVG components.
 *
 * The bespoke `components/diagrams/*` route is right when a topic needs an
 * accurate, hand-composed drawing (a chloroplast, a thylakoid membrane). It is
 * the wrong route for the long tail: a history timeline, an elasticity chart, a
 * benzene ring, a rhythm example. Those are all *specifications* a generator can
 * emit and a validator can check, so they scale to the ~20 subjects currently
 * sitting at zero visual coverage.
 *
 * Four kinds, each backed by a mature renderer:
 *   mermaid  — timelines, flowcharts, mind maps, org charts, sequence diagrams
 *   chart    — Vega-Lite: any plotted data (economics, geography, statistics)
 *   molecule — SMILES → 2D skeletal structure (chemistry)
 *   notation — ABC notation → staves, playable (music)
 *
 * Every kind is a small text/JSON grammar, which matters for two reasons: an LLM
 * emits them far more reliably than raw SVG, and `validateFigure` can reject
 * malformed output before it ever reaches a student.
 */

export type FigureKind = 'mermaid' | 'chart' | 'molecule' | 'notation'

type FigureBase = {
  title: string
  /** Shown under the figure. Say what the student should notice, not what it is. */
  caption?: string
}

export type MermaidFigure = FigureBase & {
  kind: 'mermaid'
  /** Mermaid source, e.g. `timeline` / `flowchart LR` / `mindmap`. */
  source: string
}

export type ChartFigure = FigureBase & {
  kind: 'chart'
  /**
   * Vega-Lite spec. Data must be inline (`data.values`) — see `validateFigure`,
   * which rejects remote data so a lesson can never depend on a third-party
   * endpoint being up, or leak a student's IP to one.
   */
  spec: Record<string, unknown>
}

export type MoleculeFigure = FigureBase & {
  kind: 'molecule'
  /** SMILES string, e.g. `c1ccccc1` for benzene. */
  smiles: string
}

export type NotationFigure = FigureBase & {
  kind: 'notation'
  /** ABC notation source. */
  abc: string
  /** Render a play button (uses the browser's audio context on demand). */
  playable?: boolean
}

export type LessonFigure = MermaidFigure | ChartFigure | MoleculeFigure | NotationFigure

export const FIGURE_KINDS: FigureKind[] = ['mermaid', 'chart', 'molecule', 'notation']

/** Mermaid graph types we allow. Anything else is a generator mistake. */
const MERMAID_HEADS = [
  'timeline',
  'flowchart',
  'graph',
  'mindmap',
  'sequenceDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'classDiagram',
  'erDiagram',
  'journey',
  'quadrantChart',
  'pie',
  'gitGraph',
  'xychart-beta',
  'block-beta',
]

/**
 * Rejects a figure the renderer would choke on, or that would reach off-site.
 *
 * Returns `null` when the figure is fine, otherwise a reason. Callers should
 * drop invalid figures rather than throw: one bad generated spec must not take
 * down a whole lesson page.
 */
export function validateFigure(figure: unknown): string | null {
  if (!figure || typeof figure !== 'object') return 'not an object'
  const f = figure as Partial<LessonFigure>

  if (!f.kind || !FIGURE_KINDS.includes(f.kind as FigureKind)) {
    return `unknown kind "${String(f.kind)}"`
  }
  if (typeof f.title !== 'string' || !f.title.trim()) return 'missing title'
  if (f.caption !== undefined && typeof f.caption !== 'string') return 'caption must be a string'

  switch (f.kind) {
    case 'mermaid': {
      const src = (f as MermaidFigure).source
      if (typeof src !== 'string' || !src.trim()) return 'mermaid source is empty'
      const head = src.trim().split(/\s|\n/)[0]
      if (!MERMAID_HEADS.includes(head)) return `unsupported mermaid diagram "${head}"`
      // `click ... href` can navigate the student off-site from inside a diagram.
      if (/^\s*click\s/m.test(src)) return 'mermaid click directives are not allowed'
      return null
    }
    case 'chart': {
      const spec = (f as ChartFigure).spec
      if (!spec || typeof spec !== 'object') return 'chart spec missing'
      const data = (spec as { data?: unknown }).data
      if (!data || typeof data !== 'object') return 'chart data must be inline'
      if (!Array.isArray((data as { values?: unknown }).values)) {
        return 'chart data.values must be an inline array'
      }
      if (JSON.stringify(spec).includes('"url"')) return 'chart specs may not load remote data'
      return null
    }
    case 'molecule': {
      const smiles = (f as MoleculeFigure).smiles
      if (typeof smiles !== 'string' || !smiles.trim()) return 'smiles is empty'
      if (smiles.length > 400) return 'smiles is implausibly long'
      return null
    }
    case 'notation': {
      const abc = (f as NotationFigure).abc
      if (typeof abc !== 'string' || !abc.trim()) return 'abc source is empty'
      // ABC needs at least a key line to render anything sensible.
      if (!/^K:/m.test(abc)) return 'abc source needs a K: (key) line'
      return null
    }
    default:
      return 'unhandled kind'
  }
}

/** Keeps the valid figures and reports the rest, so bad specs surface in logs. */
export function pickValidFigures(
  figures: unknown,
  onReject?: (reason: string, index: number) => void
): LessonFigure[] {
  if (!Array.isArray(figures)) return []
  const out: LessonFigure[] = []
  figures.forEach((f, i) => {
    const reason = validateFigure(f)
    if (reason) onReject?.(reason, i)
    else out.push(f as LessonFigure)
  })
  return out
}
