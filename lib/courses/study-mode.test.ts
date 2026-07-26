import fs from 'node:fs'
import {
  stageForSection,
  stagesPresent,
  isSectionVisible,
  stepStage,
  mappedSectionIds,
  STAGE_ORDER,
  STAGE_LABEL,
} from './study-mode'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── Every section the page renders must be mapped ───────────────────────────
// A section belonging to no stage would simply vanish in study mode. Read the
// real ids out of the lesson page so this fails when a new section is added.
const page = fs.readFileSync('components/courses/margin-notes/CourseLessonPage.tsx', 'utf8')
const rendered = [...page.matchAll(/<section id="([a-z-]+)" className="lsec"/g)].map((m) => m[1])
check('found the real section ids', rendered.length >= 10)
const unmapped = rendered.filter((id) => stageForSection(id) === null)
if (unmapped.length) console.error('  unmapped sections:', unmapped.join(', '))
check('every rendered section has a stage', unmapped.length === 0)

// And nothing mapped that no longer exists — a stale entry is dead weight.
const stale = mappedSectionIds().filter((id) => !rendered.includes(id))
if (stale.length) console.error('  mapped but not rendered:', stale.join(', '))
check('no stale mappings', stale.length === 0)

// ── Stages present follow the content ───────────────────────────────────────
check('all five when everything is there', stagesPresent(rendered).length === STAGE_ORDER.length)
check('order is the learning order', stagesPresent(rendered).join(',') === STAGE_ORDER.join(','))
// A lesson with no diagram must not show an empty "See".
check('no diagram means no See', !stagesPresent(['simple', 'notes', 'quiz']).includes('see'))
check('empty lesson has no stages', stagesPresent([]).length === 0)

// ── Visibility ──────────────────────────────────────────────────────────────
check('active stage shows', isSectionVisible('notes', 'read'))
check('other stages hide', !isSectionVisible('notes', 'orient'))
check('no active stage shows everything', isSectionVisible('notes', null))
// Fail open: an unmapped section should look out of place, never disappear.
check('unmapped section stays visible', isSectionVisible('brand-new-section', 'orient'))

// ── Stepping ────────────────────────────────────────────────────────────────
const s = stagesPresent(rendered)
check('forward', stepStage(s, 'orient', 1) === 'see')
check('back', stepStage(s, 'see', -1) === 'orient')
check('clamps at the start', stepStage(s, 'orient', -1) === 'orient')
check('clamps at the end', stepStage(s, 'prove', 1) === 'prove')
// Stepping from a stage this lesson does not have must not throw or return junk.
check('unknown current falls to first', stepStage(['read', 'check'], 'orient', 1) === 'read')

check('every stage has a label', STAGE_ORDER.every((x) => !!STAGE_LABEL[x]))

if (failed > 0) process.exit(1)
console.log(`study-mode.test.ts: all checks passed (${rendered.length} sections mapped)`)
