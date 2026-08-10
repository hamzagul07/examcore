import assert from 'node:assert/strict'

// Defaults so importing the cache module (via resolve-derived-scheme) never
// crashes at load when this test runs without .env.local.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'

async function main() {
  const { resolveDerivedSchemeForMark } = await import('./resolve-derived-scheme')
  type DerivedMarkScheme = import('./derive-scheme').DerivedMarkScheme

  const scheme18: DerivedMarkScheme = {
    type: 'point_based',
    total_marks: 18,
    expected_answer: 'realisation + settlements',
    marks: Array.from({ length: 18 }, (_, i) => ({
      code: i % 2 === 0 ? 'M1' : 'A1',
      marks: 1,
      description: `point ${i + 1}`,
    })),
  }

  {
    let deriveCalls = 0
    const memory = new Map<
      string,
      { scheme: DerivedMarkScheme; total_marks: number }
    >()

    const deps = {
      lookup: async (fp: string) => {
        const hit = memory.get(fp)
        return hit
          ? {
              fingerprint: fp,
              scheme: hit.scheme,
              total_marks: hit.total_marks,
              source: 'cache' as const,
            }
          : null
      },
      write: async (params: {
        fingerprint: string
        scheme: DerivedMarkScheme
        totalMarks: number
      }) => {
        memory.set(params.fingerprint, {
          scheme: params.scheme,
          total_marks: params.totalMarks,
        })
      },
      derive: async () => {
        deriveCalls += 1
        return { scheme: scheme18, total: 18 }
      },
    }

    const first = await resolveDerivedSchemeForMark(
      {
        questionText: 'Prepare the realisation account for Omira and Peter. [18]',
        totalMarks: 18,
        subjectName: 'Accounting',
        board: 'Cambridge International',
        subjectCode: '9706',
        mathConventions: false,
      },
      deps
    )
    assert.ok(first, 'first resolve returns a scheme')
    assert.equal(first!.source, 'fresh', 'miss → fresh derive')
    assert.equal(deriveCalls, 1)

    const second = await resolveDerivedSchemeForMark(
      {
        questionText: 'Prepare the realisation account for Omira and Peter. [18]',
        totalMarks: 18,
        subjectName: 'Accounting',
        board: 'Cambridge International',
        subjectCode: '9706',
        mathConventions: false,
      },
      deps
    )
    assert.ok(second, 'second resolve returns a scheme')
    assert.equal(second!.source, 'cache', 'hit → cache')
    assert.equal(deriveCalls, 1, 'cache hit must not call derive again')
    assert.equal(second!.fingerprint, first!.fingerprint)
    assert.deepEqual(second!.scheme.marks, first!.scheme.marks)
  }

  {
    let deriveCalls = 0
    await resolveDerivedSchemeForMark(
      {
        questionText: 'Explain scarcity.',
        totalMarks: null,
        subjectName: 'Economics',
        board: 'Cambridge International',
        mathConventions: false,
      },
      {
        lookup: async () => {
          throw new Error('lookup must not run without a known total')
        },
        write: async () => {
          throw new Error('write must not run without a known total')
        },
        derive: async () => {
          deriveCalls += 1
          return {
            scheme: {
              type: 'point_based',
              total_marks: 3,
              marks: [
                { code: 'M1', marks: 1, description: 'a' },
                { code: 'M1', marks: 1, description: 'b' },
                { code: 'A1', marks: 1, description: 'c' },
              ],
            },
            total: 3,
          }
        },
      }
    )
    assert.equal(deriveCalls, 1, 'null total still derives (legacy fallback path)')
  }

  {
    let writes = 0
    await resolveDerivedSchemeForMark(
      {
        questionText: 'A long accounting dissolution. [18]',
        totalMarks: 18,
        subjectName: 'Accounting',
        board: 'Cambridge International',
        subjectCode: '9706',
        mathConventions: false,
      },
      {
        lookup: async () => null,
        write: async () => {
          writes += 1
        },
        derive: async () => ({
          scheme: {
            type: 'point_based',
            total_marks: 18,
            marks: [
              { code: 'M1', marks: 1, description: 'a' },
              { code: 'A1', marks: 17, description: 'bloated pad' },
            ],
          },
          total: 18,
          unstable: true,
        }),
      }
    )
    assert.equal(writes, 0, 'unstable schemes must not be cached')
  }

  console.log('resolve-derived-scheme: all assertions passed')
}

void main()
