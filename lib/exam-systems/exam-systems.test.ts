import {
  getExamSystem,
  getExamSystemByProfileBoardId,
  listEnabledExamSystems,
  listExamSystems,
  listMarkingExamSystems,
  resolveExamSystemForSubject,
} from '@/lib/exam-systems/registry'
import { buildMarkReturnPath } from '@/lib/exam-systems/paths'
import { LESSON_SURFACES } from '@/lib/exam-systems/surfaces'
import {
  boardLabel,
  catalogSubjectSlug,
  contentSubjectCode,
  resolveBoard,
} from '@/lib/courses/board'
import { BOARDS } from '@/lib/profile-options'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── Registry shape ──────────────────────────────────────────────────────────
check('six exam systems registered', listExamSystems().length === 6)
check(
  'all six boards enabled',
  listEnabledExamSystems()
    .map((s) => s.id)
    .sort()
    .join(',') === 'ap,aqa,cambridge,edexcel,ib,oxfordaqa'
)
check(
  'all six boards marking',
  listMarkingExamSystems()
    .map((s) => s.id)
    .join(',') === 'cambridge,edexcel,oxfordaqa,aqa,ap,ib'
)
check('aqa owns aqa-mathematics', getExamSystem('aqa').ownsSubjectCode('aqa-mathematics'))
check('ap owns ap-calculus-ab', getExamSystem('ap').ownsSubjectCode('ap-calculus-ab'))
check('9MA0 resolves to edexcel', resolveExamSystemForSubject('9MA0').id === 'edexcel')

check('CAIE route prefix', getExamSystem('cambridge').routePrefix === 'caie')
check('IB route prefix', getExamSystem('ib').routePrefix === 'ib')
check('Edexcel route prefix ready', getExamSystem('edexcel').routePrefix === 'edexcel')
check('AP dialect is earned_point', getExamSystem('ap').markingDialect === 'earned_point')
check('Edexcel grade model is ums', getExamSystem('edexcel').gradeModel === 'ums')
check('IB dialect is criterion_bands', getExamSystem('ib').markingDialect === 'criterion_bands')

// ── Profile board ids sync with onboarding ──────────────────────────────────
check(
  'Cambridge profile id',
  getExamSystemByProfileBoardId('Cambridge International')?.id === 'cambridge'
)
check('IB profile id', getExamSystemByProfileBoardId('IB')?.id === 'ib')
check('Edexcel profile id', getExamSystemByProfileBoardId('Edexcel')?.id === 'edexcel')
check('OxfordAQA profile id', getExamSystemByProfileBoardId('OxfordAQA')?.id === 'oxfordaqa')
check('AP profile id', getExamSystemByProfileBoardId('AP')?.id === 'ap')

for (const board of BOARDS) {
  const sys = getExamSystemByProfileBoardId(board.id)
  if (!sys) {
    failed++
    console.error(`FAIL onboarding board ${board.id} missing ExamSystem.profileBoardId`)
    continue
  }
  if (sys.enabled !== board.enabled) {
    failed++
    console.error(
      `FAIL ${board.id} enabled mismatch: profile=${board.enabled} system=${sys.enabled}`
    )
  }
}
check('onboarding BOARDS sync with ExamSystem adapters', true)

// ── Subject resolve (unchanged CAIE/IB behaviour) ───────────────────────────
check('9702 → cambridge', resolveExamSystemForSubject('9702').id === 'cambridge')
check('biology-hl → ib', resolveExamSystemForSubject('biology-hl').id === 'ib')
check('ib-biology-hl → ib', resolveExamSystemForSubject('ib-biology-hl').id === 'ib')
check('explicit ib wins on numeric', resolveExamSystemForSubject('9702', 'ib').id === 'ib')

// Edexcel owns Pearson unit codes so they never resolve as IB
check('edexcel owns WMA11', getExamSystem('edexcel').ownsSubjectCode('WMA11'))
check('WMA11 resolves to edexcel', resolveExamSystemForSubject('WMA11').id === 'edexcel')
check('WPH14 resolves to edexcel', resolveExamSystemForSubject('WPH14').id === 'edexcel')
check('unknown WXX99 is not edexcel', !getExamSystem('edexcel').ownsSubjectCode('WXX99'))
check(
  'oxfordaqa owns oxaqa-mathematics',
  getExamSystem('oxfordaqa').ownsSubjectCode('oxaqa-mathematics')
)
check(
  'oxaqa-physics resolves to oxfordaqa',
  resolveExamSystemForSubject('oxaqa-physics').id === 'oxfordaqa'
)
check(
  'random slug still IB catch-all',
  resolveExamSystemForSubject('anything-random').id === 'ib'
)

// board.ts still the public façade
check('resolveBoard agrees', resolveBoard('9702') === 'cambridge' && resolveBoard('tok') === 'ib')
check('contentSubjectCode via adapter', contentSubjectCode('biology-hl') === 'ib-biology-hl')
check('catalogSubjectSlug via adapter', catalogSubjectSlug('ib-biology-hl') === 'biology-hl')
check('boardLabel via adapter', boardLabel('9702') === 'Cambridge 9702')
check('IB boardLabel', boardLabel('biology-hl') === 'IB Diploma')

check(
  'mark return keeps edexcel unit',
  buildMarkReturnPath({ board: 'edexcel', subject: 'WMA11' }) ===
  '/mark?board=edexcel&subject=WMA11'
)
check(
  'mark return oxfordaqa',
  buildMarkReturnPath({ board: 'oxfordaqa', subject: 'oxaqa-mathematics' }) ===
    '/mark?board=oxfordaqa&subject=oxaqa-mathematics'
)
check(
  'mark return aqa',
  buildMarkReturnPath({ board: 'aqa', subject: 'aqa-mathematics' }) ===
    '/mark?board=aqa&subject=aqa-mathematics'
)
check(
  'mark return ap',
  buildMarkReturnPath({ board: 'ap', subject: 'ap-calculus-ab' }) ===
    '/mark?board=ap&subject=ap-calculus-ab'
)
check('mark return bare', buildMarkReturnPath({}) === '/mark')

// ── Shared surfaces liberated from CAIE naming ──────────────────────────────
check('five lesson surfaces', LESSON_SURFACES.length === 5)
check(
  'surface set',
  LESSON_SURFACES.join(',') === 'flashcards,faq,quiz,questions,mistakes'
)

if (failed > 0) process.exit(1)
console.log('exam-systems.test.ts: all checks passed')
