import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

import { SUBJECT_CODE_MAP } from '@/lib/profile-options'

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
}

type SubjectInfo = {
  subject: string
  sessions: Record<string, SessionInfo>
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

async function buildAvailableMap(): Promise<AvailableMap> {
  const result: AvailableMap = {}

  const subjectFolders = await listFolder('cambridge')

  await Promise.all(
    subjectFolders.map(async (subjectCode) => {
      // Subject codes are 4-digit numerics; skip anything else
      if (!/^\d{4}$/.test(subjectCode)) return

      const sessionFolders = await listFolder(`cambridge/${subjectCode}`)
      const sessions: Record<string, SessionInfo> = {}

      await Promise.all(
        sessionFolders.map(async (sessionCode) => {
          const parsedSession = parseSessionCode(sessionCode)
          if (!parsedSession) return

          const files = await listFolder(
            `cambridge/${subjectCode}/${sessionCode}`
          )

          // Track which components have both qp_ and ms_ PDFs
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
            sessions[sessionCode] = {
              year: parsedSession.year,
              season: parsedSession.season,
              components,
            }
          }
        })
      )

      if (Object.keys(sessions).length > 0) {
        result[subjectCode] = {
          subject: SUBJECT_CODE_MAP[subjectCode] || `Subject ${subjectCode}`,
          sessions,
        }
      }
    })
  )

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
