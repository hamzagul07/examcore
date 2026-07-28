import fs from 'node:fs'
import path from 'node:path'
import { LessonFigureBlock } from '@/components/courses/figures/LessonFigureBlock'
import { pickValidFigures } from '@/lib/courses/figures'

/** Every figure authored into a lesson, so a batch can be reviewed in one pass. */
function authoredFigures(subject: string) {
  const dir = path.join(process.cwd(), 'content/courses', subject)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      return (lesson.figures ?? []).map((fig: unknown) => ({ slug: lesson.slug, fig }))
    })
}

export const metadata = {
  title: 'Lesson figures — dev',
  robots: { index: false, follow: false },
}

/** One example per kind, drawn from the subjects that currently have no visuals. */
const SAMPLES = [
  {
    kind: 'mermaid',
    title: 'Road to war, 1914',
    caption: 'Note how little time separates the assassination from general mobilisation.',
    source: `timeline
    title July Crisis 1914
    28 June : Assassination at Sarajevo
    23 July : Austrian ultimatum to Serbia
    28 July : Austria declares war
    1 August : Germany declares war on Russia
    4 August : Britain enters the war`,
  },
  {
    kind: 'mermaid',
    title: 'Evaluating a knowledge claim (TOK)',
    caption: 'Every branch is a counterclaim you are expected to raise, not just the conclusion.',
    source: `mindmap
  root((Knowledge claim))
    Evidence
      Empirical
      Testimonial
    Method
      Falsifiable
      Replicable
    Limits
      Bias
      Scope`,
  },
  {
    kind: 'chart',
    title: 'Price elasticity of demand',
    caption: 'The flatter the curve, the more quantity responds to a price change.',
    spec: {
      mark: { type: 'line', point: true },
      data: {
        values: [
          { price: 2, quantity: 90, good: 'Elastic' },
          { price: 4, quantity: 60, good: 'Elastic' },
          { price: 6, quantity: 30, good: 'Elastic' },
          { price: 8, quantity: 8, good: 'Elastic' },
          { price: 2, quantity: 62, good: 'Inelastic' },
          { price: 4, quantity: 56, good: 'Inelastic' },
          { price: 6, quantity: 50, good: 'Inelastic' },
          { price: 8, quantity: 44, good: 'Inelastic' },
        ],
      },
      encoding: {
        x: { field: 'quantity', type: 'quantitative', title: 'Quantity demanded' },
        y: { field: 'price', type: 'quantitative', title: 'Price ($)' },
        color: { field: 'good', type: 'nominal', title: 'Good' },
      },
    },
  },
  {
    kind: 'molecule',
    title: 'Aspirin (2-acetoxybenzoic acid)',
    caption: 'Ester and carboxylic acid groups on the same benzene ring.',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
  },
  {
    kind: 'notation',
    title: 'C major scale',
    caption: 'Tone–tone–semitone–tone–tone–tone–semitone.',
    abc: 'X:1\nT:C major\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |',
    playable: true,
  },
]

export default function Page() {
  const figures = pickValidFigures(SAMPLES, (reason, i) =>
    console.warn(`sample ${i} rejected: ${reason}`)
  )
  const authored = authoredFigures('9701')

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Lesson figures</h1>
      <p className="mb-8 text-sm text-[var(--ec-text-secondary)]">
        {figures.length}/{SAMPLES.length} samples valid. Each renderer is code-split and loads only
        when a figure of that kind is present.
      </p>
      <div className="lesson-figure-stack">
        {figures.map((f, i) => (
          <LessonFigureBlock key={i} figure={f} />
        ))}
      </div>

      {authored.length ? (
        <>
          <h2 className="mb-2 mt-14 text-xl font-semibold">
            Authored in lessons — 9701 ({authored.length})
          </h2>
          <p className="mb-6 text-sm text-[var(--ec-text-secondary)]">
            Structures sourced from PubChem and formula-verified. Review pass.
          </p>
          <div className="lesson-figure-stack">
            {authored.map(({ slug, fig }, i) => (
              <div key={i}>
                <p className="mb-1 font-mono text-xs text-[var(--ec-text-tertiary)]">{slug}</p>
                <LessonFigureBlock figure={fig as never} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </main>
  )
}
