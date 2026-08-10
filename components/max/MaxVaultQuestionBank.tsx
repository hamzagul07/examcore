'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { VaultBankQuestion, VaultQuestionBank } from '@/lib/max/vault-question-bank'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'

/** Per-subject past-paper desks — sit by topic, then mark with answer only. */
export function MaxVaultQuestionBank({
  banks,
  focusCode,
}: {
  banks: VaultQuestionBank[]
  focusCode: string | null
}) {
  const fallback = banks[0]?.subjectCode ?? null
  const preferred =
    focusCode && banks.some((b) => b.subjectCode === focusCode) ? focusCode : fallback
  const [activeCode, setActiveCode] = useState<string | null>(preferred)
  const [topicFilter, setTopicFilter] = useState<string | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setActiveCode(preferred)
    setTopicFilter('all')
    setOpenId(null)
  }, [preferred])

  const active =
    banks.find((b) => b.subjectCode === activeCode) ?? banks[0] ?? null

  const topics = active?.topics ?? []
  const visibleQuestions = useMemo(() => {
    if (!active) return []
    if (topicFilter === 'all' || topics.length === 0) return active.questions
    const group = topics.find((t) => t.topicCode === topicFilter)
    return group?.questions ?? active.questions.filter((q) => q.topicCode === topicFilter)
  }, [active, topicFilter, topics])

  if (banks.length === 0 || !active) return null

  return (
    <section className="ms-vault__section" aria-labelledby="ms-vault-qbank-title">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          QB
        </span>
        <p className="ec-eyebrow mb-0">By subject · by topic</p>
        <h2 id="ms-vault-qbank-title" className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your question desks
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--blue space-y-4">
        {banks.length > 1 ? (
          <div className="ms-vault__tabs" role="tablist" aria-label="Question desk by subject">
            {banks.map((b) => {
              const selected = b.subjectCode === active.subjectCode
              return (
                <button
                  key={b.subjectCode}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`ms-vault__tab${selected ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveCode(b.subjectCode)
                    setTopicFilter('all')
                    setOpenId(null)
                  }}
                >
                  {b.subjectCode}
                  <span className="ml-1 opacity-70">{b.boardLabel}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div>
          <p className="ec-eyebrow mb-1">{active.eyebrow}</p>
          <h3 className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
            {active.title}
          </h3>
          <p className="text-body mt-2 mb-0 text-[var(--ec-text-secondary)]">
            {active.board === 'cambridge'
              ? 'Each card opens as a real exam paper — white sheet, paper font, full stem. Work it, then Mark (answer only).'
              : active.note}
          </p>
        </div>

        {topics.length > 0 ? (
          <div className="ms-vault__topic-chips" role="tablist" aria-label="Topics">
            <button
              type="button"
              className={`ms-vault__topic-chip${topicFilter === 'all' ? ' is-active' : ''}`}
              onClick={() => {
                setTopicFilter('all')
                setOpenId(null)
              }}
            >
              All ({active.questions.length})
            </button>
            {topics.map((t) => (
              <button
                key={t.topicCode}
                type="button"
                className={`ms-vault__topic-chip${topicFilter === t.topicCode ? ' is-active' : ''}`}
                onClick={() => {
                  setTopicFilter(t.topicCode)
                  setOpenId(null)
                }}
              >
                {t.topicCode}{' '}
                <span className="opacity-70">
                  {t.topicLabel.length > 28 ? `${t.topicLabel.slice(0, 28)}…` : t.topicLabel}
                </span>{' '}
                ({t.questions.length})
              </button>
            ))}
          </div>
        ) : null}

        {visibleQuestions.length > 0 ? (
          <ul className="ms-vault__qbank m-0 list-none pl-0">
            {visibleQuestions.map((q) => (
              <li key={q.id}>
                <QuestionDeskCard
                  q={q}
                  board={active.board}
                  boardLabel={active.boardLabel}
                  open={openId === q.id}
                  onToggle={() => setOpenId((id) => (id === q.id ? null : q.id))}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyDeskState
            subjectCode={active.subjectCode}
            subjectLabel={active.subjectLabel}
            topicFilter={topicFilter}
            papersHubHref={active.papersHubHref}
          />
        )}

        <p className="text-caption m-0">
          <Link href={active.papersHubHref} className="ec-link font-semibold">
            {active.board === 'cambridge'
              ? `Browse all ${active.subjectCode} topics →`
              : active.board === 'ib'
                ? `Open IB practice desk →`
                : `Open ${active.boardLabel} hub →`}
          </Link>
        </p>
      </div>
    </section>
  )
}

function EmptyDeskState({
  subjectCode,
  subjectLabel,
  topicFilter,
  papersHubHref,
}: {
  subjectCode: string
  subjectLabel: string
  topicFilter: string
  papersHubHref: string
}) {
  const bridges =
    subjectCode === '9706'
      ? [
          {
            href: '/courses/9706/1-6-2-calculation-and-evaluation-of-ratios',
            label: 'Ratios lesson',
          },
          {
            href: '/courses/9706/1-4-3-bank-reconciliation-statements',
            label: 'Bank reconciliation',
          },
          {
            href: '/courses/9706/2-2-4-cost-volume-profit-analysis',
            label: 'Cost–volume–profit',
          },
        ]
      : subjectCode === '9708'
        ? [
            {
              href: '/courses/9708/2-4-the-interaction-of-demand-and-supply',
              label: 'Demand & supply',
            },
            {
              href: '/courses/9708/1-5-production-possibility-curves',
              label: 'PPC diagrams',
            },
            {
              href: '/mark?subject=9708',
              label: 'Mark a 9708 question',
            },
          ]
        : []

  return (
    <div className="space-y-3">
      <p className="text-body m-0 text-[var(--ec-text-secondary)]">
        {topicFilter !== 'all'
          ? `No live questions queued for ${subjectCode} · ${topicFilter} yet.`
          : `The ${subjectLabel} desk is still stocking tagged papers.`}{' '}
        Use a Max lesson path below, or mark one question to seed this shelf.
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-2 pl-0">
        {bridges.map((b) => (
          <li key={b.href}>
            <Link href={b.href} className="ec-btn-secondary text-sm">
              {b.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href={papersHubHref} className="ec-btn-secondary text-sm">
            {subjectCode} papers
          </Link>
        </li>
      </ul>
    </div>
  )
}

function QuestionDeskCard({
  q,
  board,
  boardLabel,
  open,
  onToggle,
}: {
  q: VaultBankQuestion
  board: VaultQuestionBank['board']
  boardLabel: string
  open: boolean
  onToggle: () => void
}) {
  const canSit = board === 'cambridge' && q.source !== 'desk'
  const hasInlineStem = !!(q.stem && q.stem.length > 160)
  const [fullStem, setFullStem] = useState<string | null>(hasInlineStem ? q.stem : null)
  const [loadingStem, setLoadingStem] = useState(false)
  const [stemError, setStemError] = useState<string | null>(null)

  useEffect(() => {
    if (hasInlineStem) setFullStem(q.stem)
  }, [hasInlineStem, q.stem])

  useEffect(() => {
    if (!open || !canSit) return
    if (fullStem) return
    const session = normalizePaperSession(q.paperSession).label || q.paperSession
    if (!q.paperCode || !session || !q.questionNumber) return

    let cancelled = false
    setLoadingStem(true)
    setStemError(null)
    const url =
      `/api/mark/question-detail?paper_code=${encodeURIComponent(q.paperCode)}` +
      `&paper_session=${encodeURIComponent(session)}` +
      `&question_number=${encodeURIComponent(q.questionNumber)}`

    fetch(url)
      .then(async (res) => {
        const data = (await res.json()) as {
          found?: boolean
          question_text?: string
          error?: string
        }
        if (cancelled) return
        if (!res.ok || data.error) {
          setStemError('Could not load the full question.')
          return
        }
        if (data.found && data.question_text?.trim()) {
          setFullStem(data.question_text.trim())
        } else if (q.stem) {
          setFullStem(q.stem)
        } else {
          setStemError('Question text is not in the bank yet — open Mark to use the paper pickers.')
        }
      })
      .catch(() => {
        if (!cancelled) setStemError('Could not load the full question.')
      })
      .finally(() => {
        if (!cancelled) setLoadingStem(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, canSit, fullStem, q.paperCode, q.paperSession, q.questionNumber, q.stem])

  const preview = q.stem || q.reason
  const paperId =
    q.source === 'desk'
      ? `${boardLabel} desk`
      : `${q.paperCode ?? boardLabel}`
  const sessionLine = q.paperSession || ''
  const qLabel = q.questionNumber ? `Question ${q.questionNumber}` : 'Question'
  const boardName =
    board === 'cambridge'
      ? 'Cambridge International'
      : board === 'ib'
        ? 'IB Diploma Programme'
        : board === 'edexcel'
          ? 'Pearson Edexcel'
          : board === 'aqa'
            ? 'AQA'
            : boardLabel
  const boardSub =
    board === 'cambridge'
      ? 'A Level · examination paper'
      : board === 'ib'
        ? 'Examination-style practice'
        : `${boardLabel} · examination paper`

  return (
    <article className={`ms-vault__exam-slip${open ? ' is-open' : ''}`}>
      <header className="ms-vault__exam-masthead">
        <div className="ms-vault__exam-board">
          <span className="ms-vault__exam-board-name">{boardName}</span>
          <span className="ms-vault__exam-board-sub">{boardSub}</span>
        </div>
        <div className="ms-vault__exam-ids">
          <span className="ms-vault__exam-code">{paperId}</span>
          {sessionLine ? <span className="ms-vault__exam-session">{sessionLine}</span> : null}
          {q.totalMarks != null ? (
            <span className="ms-vault__exam-marks">[{q.totalMarks}]</span>
          ) : null}
        </div>
      </header>

      <div className="ms-vault__exam-topic-row">
        <span className="ms-vault__exam-topic">{q.topicLabel}</span>
        <span
          className={
            q.source === 'weakness'
              ? 'ms-vault__qbank-tag ms-vault__qbank-tag--weak'
              : 'ms-vault__qbank-tag'
          }
        >
          {q.topicCode || (q.source === 'weakness' ? 'Your gap' : boardLabel)}
        </span>
      </div>

      {open && canSit ? (
        <div className="ms-vault__exam-sheet">
          <p className="ms-vault__exam-qnum m-0">{qLabel}</p>
          {loadingStem ? (
            <p className="ms-vault__exam-body m-0">Loading full question…</p>
          ) : fullStem ? (
            <p className="ms-vault__exam-body m-0 whitespace-pre-wrap">{fullStem}</p>
          ) : (
            <p className="ms-vault__exam-body ms-vault__exam-body--muted m-0">
              {stemError || preview}
            </p>
          )}
          <p className="ms-vault__exam-rubric m-0">
            Answer on lined paper as in the exam. Then mark — we lock this paper so you only
            upload your answer against the official scheme.
          </p>
          <div className="ms-vault__qbank-actions">
            <Link href={q.attemptHref} className="ec-btn-primary text-sm">
              Mark my answer →
            </Link>
            <button type="button" className="ec-btn-ghost text-sm" onClick={onToggle}>
              Fold paper
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="ms-vault__exam-qnum m-0">{qLabel}</p>
          <p className="ms-vault__exam-preview m-0">{preview}</p>
          <div className="ms-vault__qbank-actions">
            {canSit ? (
              <button type="button" className="ec-btn-primary text-sm" onClick={onToggle}>
                Open exam paper →
              </button>
            ) : (
              <Link href={q.attemptHref} className="ec-btn-primary text-sm">
                {board === 'ib' ? 'Drill & mark (IB) →' : `Open ${boardLabel} mark →`}
              </Link>
            )}
            {q.topicHubHref ? (
              <Link href={q.topicHubHref} className="ec-btn-ghost text-sm">
                More on this topic
              </Link>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}
