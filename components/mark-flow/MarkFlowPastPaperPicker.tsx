'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { QuestionPreviewPanel } from '@/components/mark/QuestionPreviewPanel'
import { getSubjectByCode } from '@/lib/profile-options'
import {
  getComponentsForSession,
  getSeasonsForYearFromSessions,
  getSubjectPaperStructure,
  getYearsFromSessions,
} from '@/lib/subject-papers'
import { sessionCodeFromYearSeason } from '@/lib/marking/session'

export type AvailablePapersMap = Record<
  string,
  {
    subject: string
    sessions: Record<
      string,
      { year: number; season: string; components: string[] }
    >
  }
>

export type PastPaperPick = {
  subjectCode: string
  paperCode: string
  paperSession: string
  questionNumber: string
}

type Props = {
  availablePapers: AvailablePapersMap | null
  papersLoading: boolean
  subjectCodes: string[]
  /** Seed from draft when returning from Confirm. */
  initial?: Partial<PastPaperPick> | null
  onChange: (pick: PastPaperPick | null) => void
}

function labelFor(code: string, papers: AvailablePapersMap | null) {
  return papers?.[code]?.subject ?? getSubjectByCode(code)?.label ?? code
}

function seedFromInitial(initial: Partial<PastPaperPick> | null | undefined) {
  const paperCode = initial?.paperCode?.trim() ?? ''
  const slash = paperCode.indexOf('/')
  const subject =
    initial?.subjectCode?.trim() ||
    (slash > 0 ? paperCode.slice(0, slash) : '') ||
    ''
  const component = slash > 0 ? paperCode.slice(slash + 1) : ''
  let year: number | '' = ''
  let session = ''
  const sess = initial?.paperSession?.trim() ?? ''
  const m = sess.match(/^(.*)\s+(\d{4})$/)
  if (m) {
    session = m[1].trim()
    year = Number(m[2])
  }
  return {
    subject,
    year,
    session,
    component,
    questionNumber: initial?.questionNumber?.trim() ?? '',
  }
}

/**
 * Cambridge past-paper catalog pickers for MarkFlow Capture.
 * Writes paperCode / session / questionNumber in the shape classic `/mark` expects.
 */
export function MarkFlowPastPaperPicker({
  availablePapers,
  papersLoading,
  subjectCodes,
  initial = null,
  onChange,
}: Props) {
  const seed = seedFromInitial(initial)
  const [subject, setSubject] = useState(seed.subject)
  const [year, setYear] = useState<number | ''>(seed.year)
  const [session, setSession] = useState(seed.session)
  const [component, setComponent] = useState(seed.component)
  const [questionNumber, setQuestionNumber] = useState(seed.questionNumber)
  const [questionOptions, setQuestionOptions] = useState<string[]>([])

  const paperStructure = useMemo(
    () => (subject ? getSubjectPaperStructure(subject) : null),
    [subject]
  )

  const availableYears = useMemo(() => {
    if (!subject) return [] as number[]
    const years = new Set<number>()
    if (availablePapers?.[subject]) {
      for (const s of Object.values(availablePapers[subject].sessions)) {
        years.add(s.year)
      }
    }
    if (paperStructure?.sessions?.length) {
      for (const y of getYearsFromSessions(paperStructure.sessions)) years.add(y)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [subject, availablePapers, paperStructure])

  const availableSeasons = useMemo(() => {
    if (!subject || year === '') return [] as string[]
    const seasons = new Set<string>()
    if (availablePapers?.[subject]) {
      for (const s of Object.values(availablePapers[subject].sessions)) {
        if (s.year === year) seasons.add(s.season)
      }
    }
    if (paperStructure?.sessions?.length) {
      for (const season of getSeasonsForYearFromSessions(
        paperStructure.sessions,
        year
      )) {
        seasons.add(season)
      }
    }
    return Array.from(seasons)
  }, [subject, year, availablePapers, paperStructure])

  const matchedSessionCode = useMemo(() => {
    if (!subject || year === '' || !session) return ''
    const sessions = availablePapers?.[subject]?.sessions
    if (sessions) {
      for (const [code, s] of Object.entries(sessions)) {
        if (s.year === year && s.season === session) return code
      }
    }
    return sessionCodeFromYearSeason(year, session) ?? ''
  }, [subject, year, session, availablePapers])

  const availableComponents = useMemo(() => {
    if (!subject || !matchedSessionCode) return [] as string[]
    const fromStorage =
      availablePapers?.[subject]?.sessions[matchedSessionCode]?.components ?? []
    if (fromStorage.length > 0) return fromStorage
    if (paperStructure && year !== '' && session) {
      return getComponentsForSession(paperStructure, year, session)
    }
    return []
  }, [
    subject,
    matchedSessionCode,
    availablePapers,
    paperStructure,
    year,
    session,
  ])

  const componentLabel = useMemo(() => {
    const labels = new Map<string, string>()
    if (paperStructure) {
      for (const group of paperStructure.papers) {
        for (const c of group.components) {
          labels.set(c, `${group.name} (${c})`)
        }
      }
    }
    return (c: string) => labels.get(c) ?? `Component ${c}`
  }, [paperStructure])

  const paperCode = subject && component ? `${subject}/${component}` : ''
  const paperSession =
    session && year !== '' ? `${session} ${year}` : ''

  useEffect(() => {
    if (!paperCode || !paperSession) {
      setQuestionOptions([])
      return
    }
    let cancelled = false
    fetch(
      `/api/mark/paper-questions?paper_code=${encodeURIComponent(paperCode)}&paper_session=${encodeURIComponent(paperSession)}`
    )
      .then((r) => r.json())
      .then((d: { questions?: string[] }) => {
        if (!cancelled) setQuestionOptions(Array.isArray(d.questions) ? d.questions : [])
      })
      .catch(() => {
        if (!cancelled) setQuestionOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [paperCode, paperSession])

  useEffect(() => {
    if (
      subject &&
      year !== '' &&
      session &&
      component &&
      questionNumber.trim()
    ) {
      onChange({
        subjectCode: subject,
        paperCode: `${subject}/${component}`,
        paperSession: `${session} ${year}`,
        questionNumber: questionNumber.trim(),
      })
    } else {
      onChange(null)
    }
  }, [subject, year, session, component, questionNumber, onChange])

  if (papersLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        aria-busy
        aria-label="Loading available papers"
      >
        <div>
          <SkeletonLine className="mb-2 h-3 w-16" />
          <SkeletonBlock className="h-11 w-full" />
        </div>
        <div>
          <SkeletonLine className="mb-2 h-3 w-16" />
          <SkeletonBlock className="h-11 w-full" />
        </div>
      </div>
    )
  }

  if (subjectCodes.length === 0) {
    return (
      <p className="text-sm text-[var(--ec-text-secondary)]">
        No Cambridge past papers available for your subjects yet. Use{' '}
        <strong className="text-[var(--ec-text-primary)]">My question</strong> instead,
        or type the paper code manually below.
      </p>
    )
  }

  const filled = !!(
    subject &&
    year !== '' &&
    session &&
    component &&
    questionNumber.trim()
  )

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Pick the exact Cambridge paper and question — we load the official scheme when
        it is in our bank.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="mf-pp-subject" className="label-overline mb-2 inline-block">
            Subject
          </Label>
          <select
            id="mf-pp-subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setYear('')
              setSession('')
              setComponent('')
              setQuestionNumber('')
            }}
            className="ec-input select-chevron appearance-none"
          >
            <option value="">Select…</option>
            {subjectCodes.map((code) => (
              <option key={code} value={code}>
                {labelFor(code, availablePapers)} ({code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="mf-pp-year" className="label-overline mb-2 inline-block">
            Year
          </Label>
          <select
            id="mf-pp-year"
            value={year === '' ? '' : String(year)}
            onChange={(e) => {
              setYear(e.target.value === '' ? '' : Number(e.target.value))
              setSession('')
              setComponent('')
              setQuestionNumber('')
            }}
            disabled={!subject}
            className="ec-input select-chevron appearance-none"
          >
            <option value="">Select…</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="mf-pp-session" className="label-overline mb-2 inline-block">
            Session
          </Label>
          <select
            id="mf-pp-session"
            value={session}
            onChange={(e) => {
              setSession(e.target.value)
              setComponent('')
              setQuestionNumber('')
            }}
            disabled={year === ''}
            className="ec-input select-chevron appearance-none"
          >
            <option value="">Select…</option>
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="mf-pp-component" className="label-overline mb-2 inline-block">
            Paper
          </Label>
          <select
            id="mf-pp-component"
            value={component}
            onChange={(e) => {
              setComponent(e.target.value)
              setQuestionNumber('')
            }}
            disabled={!session}
            className="ec-input select-chevron appearance-none"
          >
            <option value="">Select…</option>
            {availableComponents.map((c) => (
              <option key={c} value={c}>
                {componentLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="mf-pp-question" className="label-overline mb-2 inline-block">
            Question number
          </Label>
          {questionOptions.length > 0 ? (
            <select
              id="mf-pp-question"
              value={questionNumber}
              onChange={(e) => setQuestionNumber(e.target.value)}
              disabled={!component}
              className="ec-input select-chevron appearance-none"
            >
              <option value="">Select…</option>
              {questionOptions.map((q) => (
                <option key={q} value={q}>
                  Question {q}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="mf-pp-question"
              type="text"
              value={questionNumber}
              onChange={(e) => setQuestionNumber(e.target.value)}
              disabled={!component}
              placeholder="e.g., 1, 2(a), 3(b)(i)"
              className="ec-input"
            />
          )}
        </div>
      </div>

      {filled ? (
        <>
          <div className="ec-highlight-success text-sm">
            Selected:{' '}
            <strong>
              {subject}/{component}
            </strong>{' '}
            — {session} {year}, Question <strong>{questionNumber.trim()}</strong>
          </div>
          <QuestionPreviewPanel
            paperCode={paperCode}
            paperSession={paperSession}
            questionNumber={questionNumber}
            subjectCode={subject}
          />
        </>
      ) : null}
    </div>
  )
}
