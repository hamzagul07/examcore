import fs from 'node:fs'
import {
  stageForSection,
  stagesPresent,
  isSectionVisible,
  stepStage,
  mappedSectionIds,
  firstSectionForStage,
  stageChapterMark,
  STAGE_ORDER,
  STAGE_LABEL,
  STAGE_SUB,
  STAGE_COACH,
  STAGE_STRIP,
} from './study-mode'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── Every section the page renders must be mapped ───────────────────────────
const page = fs.readFileSync('components/courses/margin-notes/CourseLessonPage.tsx', 'utf8')
const rendered = [
  ...page.matchAll(/lsecProps\('([a-z-]+)'\)/g),
].map((m) => m[1])
check('found the real section ids', rendered.length >= 10)
const unmapped = rendered.filter((id) => stageForSection(id) === null)
if (unmapped.length) console.error('  unmapped sections:', unmapped.join(', '))
check('every rendered section has a stage', unmapped.length === 0)

const stale = mappedSectionIds().filter((id) => !rendered.includes(id))
if (stale.length) console.error('  mapped but not rendered:', stale.join(', '))
check('no stale mappings', stale.length === 0)

check('all five when everything is there', stagesPresent(rendered).length === STAGE_ORDER.length)
check('order is the learning order', stagesPresent(rendered).join(',') === STAGE_ORDER.join(','))
check('no diagram means no See', !stagesPresent(['simple', 'notes', 'quiz']).includes('see'))
check('empty lesson has no stages', stagesPresent([]).length === 0)

// Legacy visibility helper still maps honestly (flow mode shows everything).
check('active stage shows', isSectionVisible('notes', 'read'))
check('other stages hide', !isSectionVisible('notes', 'orient'))
check('no active stage shows everything', isSectionVisible('notes', null))
check('unmapped section stays visible', isSectionVisible('brand-new-section', 'orient'))

const s = stagesPresent(rendered)
check('forward', stepStage(s, 'orient', 1) === 'see')
check('back', stepStage(s, 'see', -1) === 'orient')
check('clamps at the start', stepStage(s, 'orient', -1) === 'orient')
check('clamps at the end', stepStage(s, 'prove', 1) === 'prove')
check('unknown current falls to first', stepStage(['read', 'check'], 'orient', 1) === 'read')

check('every stage has a label', STAGE_ORDER.every((x) => !!STAGE_LABEL[x]))
check('every stage has a sub', STAGE_ORDER.every((x) => !!STAGE_SUB[x]))
check('every stage has a coach line', STAGE_ORDER.every((x) => !!STAGE_COACH[x]))
check('every stage has a strip label', STAGE_ORDER.every((x) => !!STAGE_STRIP[x]))
check('glossary sits in Read', stageForSection('glossary') === 'read')
check('quiz sits in Check', stageForSection('quiz') === 'check')
check('teachback sits in Check', stageForSection('teachback') === 'check')
check('cards sit in Check', stageForSection('cards') === 'check')

const stages = stagesPresent(rendered)
check(
  'first section for check is quiz when present',
  firstSectionForStage(rendered, 'check') === 'quiz'
)
const mark = stageChapterMark('quiz', rendered, stages)
check('chapter mark on first check section', !!mark && mark.label.includes('CHECK'))
check('not first stage mark', !!mark && mark.first === false)
check(
  'no chapter mark mid-stage',
  stageChapterMark('teachback', rendered, stages) === null
)

check('DOM order is quiz then teachback then cards', (() => {
  const q = page.indexOf("lsecProps('quiz')")
  const t = page.indexOf("lsecProps('teachback')")
  const c = page.indexOf("lsecProps('cards')")
  return q > 0 && t > q && c > t
})())

if (failed > 0) process.exit(1)
console.log(`study-mode.test.ts: all checks passed (${rendered.length} sections mapped)`)
