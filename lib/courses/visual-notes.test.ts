import { buildNoteSketch, sketchLabel } from './visual-notes'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('label strips latex', !sketchLabel('Force $F=ma$ acts').includes('$'))
check('label truncates', sketchLabel('x'.repeat(80)).endsWith('…'))

const withBullets = buildNoteSketch(
  {
    h: 'Moment of a force',
    p: 'Long prose here.',
    bullets: ['Moment = Force × perpendicular distance', 'Use d_perp not along the bar'],
    tip: 'Examiners dock the wrong distance',
  },
  { noteIndex: 0 }
)
check('uses bullets as nodes', withBullets.nodes.length === 3)
check('tip is last', withBullets.nodes[2]?.kind === 'tip')
check('no fig without step', !withBullets.figNum)

const withStep = buildNoteSketch(
  { h: 'Vectors', p: 'A vector has magnitude and direction.' },
  { noteIndex: 1, stepTitle: 'Add tip to tail' }
)
check('sentence becomes node', withStep.nodes.length >= 1)
check('fig number pads', withStep.figNum === '02')
check('fig caption from step', withStep.figCaption === 'Add tip to tail')

if (failed > 0) process.exit(1)
console.log('visual-notes.test.ts: all checks passed')
