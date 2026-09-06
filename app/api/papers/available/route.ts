import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { ALL_PAPER_STORAGE_PREFIXES } from '@/lib/paper-storage'
import {
  schemeCoverageKey,
  schemeSessionLabel,
} from '@/lib/marking/scheme-coverage'

const SEASON_MAP: Record<string, string> = {
  s: 'May/June',
  w: 'October/November',
  m: 'February/March',
}

const CACHE_TTL_MS = 5 * 60 * 1000

type SessionInfo = {
  year: number
  season: string
  components: string[]
  /**
   * The components in this session we hold a STRUCTURED mark scheme for, as
   * opposed to a mark scheme PDF.
   *
   * These are not the same thing and conflating them is what made the marking
   * page dishonest. `components` comes from storage: a component is listed when
   * both `qp_` and `ms_` PDFs exist. But marking against the official scheme
   * needs the extracted `mark_schemes` rows, and extraction has only ever been
   * run for 10 subjects. So a student could select 4024 or 5070 — offered,
   * because the PDFs are there — and then be asked to type the total marks
   * themselves after a three-minute wait, because nothing structured existed to
   * mark against.
   *
   * Measured over 60 days: past-paper runs failed at 32%, and half of those
   * failures were "we could not read the total marks from your question".
   */
  schemeComponents: string[]
}

type SubjectInfo = {
  subject: string
  sessions: Record<string, SessionInfo>
  /** Any structured mark scheme at all for this subject. */
  hasSchemes: boolean
}

type AvailableMap = Record<string, SubjectInfo>

let cache: { data: AvailableMap; expiresAt: number } | null = null

function parseSessionCode(
  code: string
): { year: number; season: string } | null {
  const match = code.toLowerCase().match(/^([smw])(\d{2})$/)
  if (!match) return null
  const [, letter, yearTwoDigit] = match
  const season = SEASON_MAP[letter]
  if (!season) return null
  return { year: 2000 + parseInt(yearTwoDigit, 10), season }
}

async function listFolder(path: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage
    .from('paper-pdfs')
    .list(path, { limit: 1000 })
  if (error || !data) return []
  // Folders are entries where id is null; files have id set.
  return data.map((d) => d.name)
}

/**
 * Every (paper_code, session) pair we hold an extracted mark scheme for, as
 * `"9709/12|May/June 2024"`.
 *
 * Paged explicitly: PostgREST caps a plain select at 1,000 rows, and silently
 * returning the first page would report most of the catalogue as uncovered —
 * the exact failure this set exists to prevent, inverted. Fails OPEN (empty
 * set) so a database wobble degrades to today's behaviour rather than telling
 * every student their subject is unsupported.
 */
async function loadSchemeCoverage(): Promise<Set<string>> {
  const covered = new Set<string>()
  const PAGE = 1000

  for (let from = 0; from < 100_000; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('mark_schemes')
      .select('paper_code, paper_session')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('papers/available scheme coverage:', error.message)
      return new Set()
    }
    if (!data?.length) break

    for (const row of data) {
      if (row.paper_code && row.paper_session) {
        // Same shape schemeCoverageKey() produces, assembled from the two
        // columns it is keyed on.
        covered.add(`${row.paper_code}|${row.paper_session}`)
      }
    }
    if (data.length < PAGE) break
  }

  return covered
}

async function buildAvailableMap(): Promise<AvailableMap> {
  const result: AvailableMap = {}
  const schemeCoverage = await loadSchemeCoverage()

  for (const storagePrefix of ALL_PAPER_STORAGE_PREFIXES) {
    const subjectFolders = await listFolder(storagePrefix)

    await Promise.all(
      subjectFolders.map(async (subjectCode) => {
        if (!/^\d{4}$/.test(subjectCode)) return

        const sessionFolders = await listFolder(`${storagePrefix}/${subjectCode}`)
        const sessions: Record<string, SessionInfo> = {}

        await Promise.all(
          sessionFolders.map(async (sessionCode) => {
            const parsedSession = parseSessionCode(sessionCode)
            if (!parsedSession) return

            const files = await listFolder(
              `${storagePrefix}/${subjectCode}/${sessionCode}`
            )

            const componentStatus: Record<string, { qp: boolean; ms: boolean }> = {}
            for (const fileName of files) {
              const m = fileName.toLowerCase().match(/^(qp|ms)_(.+)\.pdf$/)
              if (!m) continue
              const [, kind, component] = m
              if (!componentStatus[component]) {
                componentStatus[component] = { qp: false, ms: false }
              }
              if (kind === 'qp') componentStatus[component].qp = true
              if (kind === 'ms') componentStatus[component].ms = true
            }

            const components = Object.entries(componentStatus)
              .filter(([, status]) => status.qp && status.ms)
              .map(([component]) => component)
              .sort()

            if (components.length > 0) {
              const sessionLabel = schemeSessionLabel(
                parsedSession.season,
                parsedSession.year
              )
              const schemeComponents = components.filter((component) =>
                schemeCoverage.has(
                  schemeCoverageKey(subjectCode, component, sessionLabel)
                )
              )

              sessions[sessionCode] = {
                year: parsedSession.year,
                season: parsedSession.season,
                components,
                schemeComponents,
              }
            }
          })
        )

        if (Object.keys(sessions).length > 0) {
          result[subjectCode] = {
            subject: SUBJECT_CODE_MAP[subjectCode] || `Subject ${subjectCode}`,
            sessions,
            hasSchemes: Object.values(sessions).some(
              (session) => session.schemeComponents.length > 0
            ),
          }
        }
      })
    )
  }

  return result
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && cache.expiresAt > now) {
      return NextResponse.json({ available: cache.data, cached: true })
    }

    const available = await buildAvailableMap()
    cache = { data: available, expiresAt: now + CACHE_TTL_MS }
    return NextResponse.json({ available, cached: false })
  } catch (err) {
    console.error('papers/available error:', err)
    // Serve stale cache if we have one
    if (cache) {
      return NextResponse.json({ available: cache.data, cached: true, stale: true })
    }
    return NextResponse.json({ available: {} as AvailableMap }, { status: 200 })
  }
}
