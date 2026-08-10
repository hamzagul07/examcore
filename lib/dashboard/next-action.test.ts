import { buildNextAction } from './next-action'
import type { ReviewItem } from '@/lib/courses/review-queue'
import type { Recommendation } from '@/lib/insights/types'

function due(partial: Partial<ReviewItem> & Pick<ReviewItem, 'source' | 'name'>): ReviewItem {
  return {
    subject: '9702',
    subjectLabel: 'Physics',
    code: '1.1',
    level: 'critical',
    percentage: partial.source === 'recall' ? 0 : 42,
    attemptsCount: partial.source === 'recall' ? 0 : 2,
    daysSince: 3,
    topErrors: [],
    practiceHref: '/mark?subject=9702&topic=1.1',
    lessonHref: '/courses/cambridge/physics/forces',
    ...partial,
  }
}

let failed = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error('FAIL:', label)
    failed += 1
  }
}

const recall = due({ source: 'recall', name: 'Forces' })
const marked = due({ source: 'attempts', name: 'Waves', percentage: 38 })
const rec: Recommendation = {
  targetLabel: 'Paper 2 Q3',
  reason: 'Common miss on this paper.',
  questionNumber: '3',
  paperCode: '9702/21',
  paperSession: 'MJ24',
  totalMarks: 8,
  topicCode: '1.1',
}

const fromRecall = buildNextAction({ reviewItems: [recall, marked], recommendations: [] })
check('recall titles Due', fromRecall.title === 'Due: Forces')
check('recall stamp DUE', fromRecall.stamp === 'DUE')
check('recall CTA marks', fromRecall.ctaLabel === 'Mark one question')
check('recall href is practice', fromRecall.href === recall.practiceHref)
check('recall secondary lesson', fromRecall.secondary?.href === recall.lessonHref)
check('recall dueCount', fromRecall.dueCount === 2)

const fromMarked = buildNextAction({ reviewItems: [marked], recommendations: [] })
check('marked titles Due', fromMarked.title === 'Due: Waves')
check('marked CTA review', fromMarked.ctaLabel === 'Review now')
check('marked href practice', fromMarked.href === marked.practiceHref)
check('single due has count 1', fromMarked.dueCount === 1)

const fromDrill = buildNextAction({ reviewItems: [], recommendations: [rec] })
check('drill kind', fromDrill.kind === 'drill')
check('drill CTA', fromDrill.ctaLabel === 'Drill this')

const empty = buildNextAction({ reviewItems: [], recommendations: [] })
check('empty mark fallback', empty.kind === 'mark')
check('empty why', empty.why.includes('Nothing due'))

if (failed > 0) process.exit(1)
console.log('next-action.test.ts: all checks passed')
