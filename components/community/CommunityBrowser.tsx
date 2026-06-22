'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { NotesSection } from '@/components/community/NotesSection'
import { QASection } from '@/components/community/QASection'

export type BrowserSubject = { id: string; name: string; glyph: string; accent: string }

export function CommunityBrowser({
  cambridge,
  ib,
  initialSubjectId,
  askOpen = false,
  questionId,
}: {
  cambridge: BrowserSubject[]
  ib: BrowserSubject[]
  initialSubjectId?: string
  askOpen?: boolean
  questionId?: string | null
}) {
  const initialIb = initialSubjectId ? ib.find((s) => s.id === initialSubjectId) : null
  const initialCam = initialSubjectId ? cambridge.find((s) => s.id === initialSubjectId) : null
  const initialSel = initialIb ?? initialCam ?? null
  const [board, setBoard] = useState<'cambridge' | 'ib'>(initialIb ? 'ib' : 'cambridge')
  const [sel, setSel] = useState<BrowserSubject | null>(initialSel)
  const list = board === 'cambridge' ? cambridge : ib
  const boardLabel = board === 'ib' ? 'IB' : 'A-Level'

  return (
    <div className="community-browser">
      <div className="community-board-tabs" role="tablist" aria-label="Exam board">
        <button
          role="tab"
          aria-selected={board === 'cambridge'}
          className={`community-board-tab${board === 'cambridge' ? ' on' : ''}`}
          onClick={() => {
            setBoard('cambridge')
            setSel(null)
          }}
        >
          A-Level
        </button>
        <button
          role="tab"
          aria-selected={board === 'ib'}
          className={`community-board-tab${board === 'ib' ? ' on' : ''}`}
          onClick={() => {
            setBoard('ib')
            setSel(null)
          }}
        >
          IB Diploma
        </button>
      </div>

      {sel ? (
        <div style={{ '--sc': sel.accent } as CSSProperties}>
          <button type="button" className="ec-btn-underline text-sm community-back" onClick={() => setSel(null)}>
            ← All {boardLabel} subjects
          </button>
          <div className="community-selected-head">
            <span className="community-selected-glyph" style={{ '--sc': sel.accent } as CSSProperties}>
              {sel.glyph}
            </span>
            <h2 className="ms-h3" style={{ margin: 0 }}>
              {sel.name}
            </h2>
          </div>
          <NotesSection board={board} subjectCode={sel.id} subjectName={sel.name} accent={sel.accent} />
          <QASection
            board={board}
            subjectCode={sel.id}
            subjectName={sel.name}
            accent={sel.accent}
            questionId={questionId}
            askOpen={askOpen && sel.id === initialSubjectId}
          />
        </div>
      ) : (
        <>
          <p className="ms-body-2 community-pick-hint">
            Pick a subject to read its community notes and questions — or contribute your own.
          </p>
          <ul className="community-subject-grid">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="community-subject-chip"
                  style={{ '--sc': s.accent } as CSSProperties}
                  onClick={() => setSel(s)}
                >
                  <span className="community-subject-glyph">{s.glyph}</span>
                  <span className="community-subject-name">{s.name}</span>
                  <span className="community-subject-go" aria-hidden>
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
