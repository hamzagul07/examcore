import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { resolvePaperMeta } from './content-source'
import { LessonEvidenceSchema } from './content-source.schema'

function loadEnv() {
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const TUPLES: Array<[string, string, string]> = [
  ['9702', '4', '14.3'],
  ['9702', '1', '2.1'],
  ['9702', '3', '1.3'],
  ['9702', '4', '25.3'],
  ['9702', '2', '7.1'],
]

async function main() {
  loadEnv()

  const meta = resolvePaperMeta('9702', '4')
  assert.equal(meta.paperKind, 'structured')
  assert.ok(meta.displayName.includes('Paper 4'))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('content-source.test.ts: skipped DB checks (no Supabase env)')
    return
  }

  const { getLessonEvidence } = await import('./content-source')

  for (const [subject, paper, topic] of TUPLES) {
    const evidence = await getLessonEvidence(subject, paper, topic, {
      session: 'May/June',
      year: 2024,
    })
    LessonEvidenceSchema.parse(evidence)

    const qIds = new Set(evidence.questions.map((q) => q.id))
    const orphanMarks = evidence.markSchemes.filter((m) => !qIds.has(m.question_id))
    assert.equal(
      orphanMarks.length,
      0,
      `${paper}/${topic}: orphan mark points`
    )

    for (const q of evidence.questions) {
      assert.equal(q.paper_number, paper, `${q.question_number} wrong paper`)
      if (q.parent_question_id && !q.parent_stem) {
        console.warn(
          `  warn: ${q.question_number} has parent but no parent_stem loaded`
        )
      }
    }

    console.log(
      `[${subject} P${paper} ${topic}] objectives=${evidence.objectives.length} questions=${evidence.questions.length} marks=${evidence.markSchemes.length}`
    )

    if (paper === '4' && topic === '14.3') {
      assert.ok(evidence.objectives.length >= 3, '14.3 should have 3+ objectives')
      // s24 Paper 4 did not examine 14.3 (thermodynamics latent heat); objectives still load.
      if (evidence.questions.length === 0) {
        console.log('  note: s24 P4 has no 14.3-tagged questions (expected for this session)')
      }
    }

    const richTuples: Record<string, string> = {
      '1/2.1': 'Paper 1 kinematics MCQ',
      '3/1.3': 'Paper 3 practical skills',
      '4/25.3': 'Paper 4 cosmology',
      '2/7.1': 'Paper 2 waves',
    }
    const key = `${paper}/${topic}`
    if (richTuples[key]) {
      assert.ok(evidence.objectives.length >= 1, `${key}: missing objectives`)
      assert.ok(evidence.questions.length >= 1, `${key}: expected tagged questions on s24`)
      const topicPrefix = new RegExp(`^${topic.replace('.', '\\.')}\\.`)
      for (const q of evidence.questions) {
        assert.ok(q.tags.length >= 1, `${q.question_number}: missing tags`)
        assert.ok(
          q.tags.some((t) => topicPrefix.test(t.objective_number)),
          `${q.question_number}: expected at least one ${topic}.x tag`
        )
      }
      if (evidence.questions.length > 0) {
        assert.ok(
          evidence.markSchemes.length >= 1,
          `${key}: expected mark points for tagged questions`
        )
      }
    }
  }

  console.log('content-source.test.ts: ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
