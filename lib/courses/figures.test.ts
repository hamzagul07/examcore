import { pickValidFigures, validateFigure } from '@/lib/courses/figures'

let failures = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++
    console.error(`  ✗ ${label}`)
  }
}

// ── accepts well-formed figures of every kind ──────────────────────────────
check(
  'accepts a mermaid timeline',
  validateFigure({
    kind: 'mermaid',
    title: 'Road to WWI',
    source: 'timeline\n  1914 : Assassination at Sarajevo',
  }) === null
)
check(
  'accepts a flowchart',
  validateFigure({ kind: 'mermaid', title: 'T', source: 'flowchart LR\n A-->B' }) === null
)
check(
  'accepts an inline-data chart',
  validateFigure({
    kind: 'chart',
    title: 'Demand',
    spec: { mark: 'line', data: { values: [{ p: 1, q: 9 }] } },
  }) === null
)
check(
  'accepts a molecule',
  validateFigure({ kind: 'molecule', title: 'Benzene', smiles: 'c1ccccc1' }) === null
)
check(
  'accepts abc notation with a key line',
  validateFigure({ kind: 'notation', title: 'Scale', abc: 'X:1\nK:C\nCDEF|' }) === null
)

// ── rejects malformed or unsafe figures ────────────────────────────────────
check('rejects a non-object', validateFigure(null) !== null)
check('rejects an unknown kind', validateFigure({ kind: 'hologram', title: 'x' }) !== null)
check('rejects a missing title', validateFigure({ kind: 'molecule', smiles: 'C' }) !== null)
check(
  'rejects an unsupported mermaid diagram type',
  validateFigure({ kind: 'mermaid', title: 'T', source: 'sankey-beta\n a,b,1' }) !== null
)
check(
  'rejects mermaid click directives',
  validateFigure({
    kind: 'mermaid',
    title: 'T',
    source: 'flowchart LR\n A-->B\n click A href "https://evil.test"',
  }) !== null
)
check(
  'rejects a chart with remote data',
  validateFigure({
    kind: 'chart',
    title: 'T',
    spec: { mark: 'line', data: { url: 'https://example.test/d.json' } },
  }) !== null
)
check(
  'rejects a remote url nested anywhere in a chart spec',
  validateFigure({
    kind: 'chart',
    title: 'T',
    spec: {
      mark: 'line',
      data: { values: [{ a: 1 }] },
      layer: [{ data: { url: 'https://example.test/d.json' } }],
    },
  }) !== null
)
check('rejects empty smiles', validateFigure({ kind: 'molecule', title: 'T', smiles: '  ' }) !== null)
check(
  'rejects abc with no key line',
  validateFigure({ kind: 'notation', title: 'T', abc: 'X:1\nCDEF|' }) !== null
)

// ── pickValidFigures keeps the good ones and reports the rest ──────────────
const rejected: string[] = []
const kept = pickValidFigures(
  [
    { kind: 'molecule', title: 'Benzene', smiles: 'c1ccccc1' },
    { kind: 'mermaid', title: 'Bad', source: 'sankey-beta\n a,b,1' },
    { kind: 'mermaid', title: 'Good', source: 'mindmap\n root((exam))' },
  ],
  (reason) => rejected.push(reason)
)
check('keeps only the valid figures', kept.length === 2)
check('reports one rejection', rejected.length === 1)
check('a bad figure does not drop later good ones', kept[1]?.title === 'Good')
check('non-array input yields no figures', pickValidFigures(undefined).length === 0)

if (failures) {
  console.error(`figures.test.ts: ${failures} check(s) failed`)
  process.exit(1)
}
console.log('figures.test.ts: all checks passed')
