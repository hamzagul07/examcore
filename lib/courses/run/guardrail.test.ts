import assert from 'node:assert/strict'
import path from 'path'
import {
  assertImprovementLoopEnabled,
  assertWritablePath,
  GuardrailViolation,
  isAllowedWritePath,
  isDeniedWritePath,
  normalizeProjectRelative,
} from './guardrail'

const cwd = process.cwd()

function testDeniedPaths() {
  assert.equal(isDeniedWritePath('lib/billing/enforcement.ts'), true)
  assert.equal(isDeniedWritePath('lib/marking/single-question-pipeline.ts'), true)
  assert.equal(isDeniedWritePath('supabase/migrations/20260701_ib_assessment_catalog.sql'), true)
  assert.equal(isDeniedWritePath('lib/seo/sitemap-priority.ts'), true)
  assert.equal(isDeniedWritePath('app/api/mark/process/route.ts'), true)
}

function testAllowedPaths() {
  assert.equal(isAllowedWritePath('content/courses/9702/1-1-foo.json'), true)
  assert.equal(isAllowedWritePath('public/courses/diagrams/9702-foo.png'), true)
  assert.equal(isAllowedWritePath('docs/content-generation/runs/run.json'), true)
  assert.equal(isAllowedWritePath('lib/courses/run/guardrail.ts'), false)
}

function testAssertWritableBlocksDenylist() {
  process.env.COURSE_AUTONOMY = '1'
  assert.throws(
    () => assertWritablePath('lib/billing/features.ts'),
    GuardrailViolation
  )
  assert.throws(
    () => assertWritablePath('supabase/migrations/foo.sql'),
    GuardrailViolation
  )
}

function testAssertWritableBlocksNonAllowlist() {
  process.env.COURSE_AUTONOMY = '1'
  assert.throws(
    () => assertWritablePath('README.md'),
    GuardrailViolation
  )
  assert.throws(
    () => assertWritablePath('app/mark/page.tsx'),
    GuardrailViolation
  )
}

function testAssertWritableAllowsCourseContent() {
  process.env.COURSE_AUTONOMY = '1'
  const rel = assertWritablePath('content/courses/9702/test-guardrail-write.json')
  assert.equal(rel, 'content/courses/9702/test-guardrail-write.json')
}

function testImprovementLoopDisabled() {
  delete process.env.COURSE_IMPROVEMENT_LOOP
  assert.throws(() => assertImprovementLoopEnabled(), GuardrailViolation)
  process.env.COURSE_IMPROVEMENT_LOOP = '1'
  assert.doesNotThrow(() => assertImprovementLoopEnabled())
  delete process.env.COURSE_IMPROVEMENT_LOOP
}

function testNormalizeEscapesProject() {
  assert.throws(
    () => normalizeProjectRelative('/etc/passwd'),
    GuardrailViolation
  )
}

testDeniedPaths()
testAllowedPaths()
testAssertWritableBlocksDenylist()
testAssertWritableBlocksNonAllowlist()
testAssertWritableAllowsCourseContent()
testImprovementLoopDisabled()
testNormalizeEscapesProject()

console.log('guardrail.test.ts: all passed')
