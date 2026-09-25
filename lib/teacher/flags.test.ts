import assert from 'node:assert/strict'
import { isTeacherV2 } from '@/lib/teacher/flags'

const original = process.env.TEACHER_V2

function withFlag(value: string | undefined): boolean {
  if (value === undefined) delete process.env.TEACHER_V2
  else process.env.TEACHER_V2 = value
  return isTeacherV2()
}

try {
  assert.equal(withFlag(undefined), true, 'unset: v2 ships on')
  assert.equal(withFlag(''), true, 'empty: on')
  assert.equal(withFlag('1'), true, '1: on')
  assert.equal(withFlag('true'), true, 'any other value: on')
  assert.equal(withFlag('0'), false, '0 is the kill switch')
  assert.equal(withFlag(' 0\n'), false, 'the kill switch survives a pasted newline')
  assert.equal(withFlag('00'), true, 'only exactly 0 switches it off')
} finally {
  if (original === undefined) delete process.env.TEACHER_V2
  else process.env.TEACHER_V2 = original
}

console.log('flags.test.ts — all assertions passed')
