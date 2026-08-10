/**
 * Resolve a derived mark scheme for freeform marking: cache hit first, else
 * derive + write. Extracted so remake stability can be unit-tested without the
 * full mark runner.
 */

import {
  deriveMarkScheme,
  type DeriveResult,
  type DerivedMarkScheme,
} from '@/lib/marking/derive-scheme'
import {
  lookupDerivedScheme,
  writeDerivedScheme,
} from '@/lib/marking/derived-scheme-cache'
import { schemeFingerprint } from '@/lib/marking/scheme-fingerprint'

export type ResolvedDerivedScheme = {
  scheme: DerivedMarkScheme
  total: number
  fingerprint: string | null
  source: 'cache' | 'fresh'
}

export type ResolveDerivedSchemeDeps = {
  lookup?: typeof lookupDerivedScheme
  write?: typeof writeDerivedScheme
  derive?: typeof deriveMarkScheme
}

export async function resolveDerivedSchemeForMark(
  params: {
    questionText: string
    totalMarks: number | null
    subjectName: string
    board: string
    subjectCode?: string | null
    examSystem?: string | null
    mathConventions: boolean
  },
  deps: ResolveDerivedSchemeDeps = {}
): Promise<ResolvedDerivedScheme | null> {
  const lookup = deps.lookup ?? lookupDerivedScheme
  const write = deps.write ?? writeDerivedScheme
  const derive = deps.derive ?? deriveMarkScheme

  const knownTotal =
    typeof params.totalMarks === 'number' && params.totalMarks > 0
      ? params.totalMarks
      : null

  let fingerprint: string | null = null
  if (knownTotal) {
    fingerprint = schemeFingerprint({
      questionText: params.questionText,
      totalMarks: knownTotal,
      subjectCode: params.subjectCode,
      board: params.board,
    })
    const cached = await lookup(fingerprint)
    if (cached) {
      return {
        scheme: cached.scheme,
        total: cached.total_marks,
        fingerprint,
        source: 'cache',
      }
    }
  }

  const derived: DeriveResult | null = await derive({
    subjectName: params.subjectName,
    board: params.board,
    questionText: params.questionText,
    totalMarks: knownTotal,
    mathConventions: params.mathConventions,
  })
  if (!derived) return null

  // Never persist a heavily padded / reshaped rubric — remakes would lock in
  // a bad allocation. Still return it for this run so marking can proceed.
  if (fingerprint && knownTotal && !derived.unstable) {
    await write({
      fingerprint,
      scheme: derived.scheme,
      totalMarks: derived.total,
      subjectCode: params.subjectCode,
      examSystem: params.examSystem,
    })
  }

  return {
    scheme: derived.scheme,
    total: derived.total,
    fingerprint,
    source: 'fresh',
  }
}
