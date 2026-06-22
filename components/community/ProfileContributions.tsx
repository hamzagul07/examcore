'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CommunityNote } from '@/lib/community/notes'
import type { Question } from '@/lib/community/qa'

type Props = {
  notes: CommunityNote[]
  questions: Question[]
  answersCount: number
}

export function ProfileContributions({ notes, questions, answersCount }: Props) {
  const [tab, setTab] = useState<'notes' | 'questions' | 'answers'>('notes')

  return (
    <>
      <div className="exam-room-profile-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`exam-room-profile-tab${tab === 'notes' ? ' on' : ''}`}
          onClick={() => setTab('notes')}
        >
          Cheat sheets ({notes.length})
        </button>
        <button
          type="button"
          role="tab"
          className={`exam-room-profile-tab${tab === 'questions' ? ' on' : ''}`}
          onClick={() => setTab('questions')}
        >
          Doubts ({questions.length})
        </button>
        <button
          type="button"
          role="tab"
          className={`exam-room-profile-tab${tab === 'answers' ? ' on' : ''}`}
          onClick={() => setTab('answers')}
        >
          Answers ({answersCount})
        </button>
      </div>

      {tab === 'notes' ? (
        notes.length ? (
          <ul className="community-note-list">
            {notes.map((n) => (
              <li key={n.id} className="community-note-row">
                <span className="community-vote" aria-hidden>
                  <span className="community-vote-caret">▲</span>
                  <span className="community-vote-n">{n.upvoteCount}</span>
                </span>
                <Link href={`/community/notes/${n.id}`} className="community-note-main">
                  <span className="community-note-title">{n.title}</span>
                  <span className="community-note-meta">
                    {n.board === 'ib' ? 'IB' : 'Cambridge'} · {n.subjectCode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
            No published cheat sheets yet.
          </p>
        )
      ) : null}

      {tab === 'questions' ? (
        questions.length ? (
          <ul className="community-note-list">
            {questions.map((q) => (
              <li key={q.id} className="community-note-row">
                <Link href={`/community/questions/${q.id}`} className="community-note-main">
                  <span className="community-note-title">{q.title}</span>
                  <span className="community-note-meta">
                    {q.answerCount} answers · {q.subjectCode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
            No doubts posted yet.
          </p>
        )
      ) : null}

      {tab === 'answers' ? (
        <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
          {answersCount} published answers across the community.
        </p>
      ) : null}
    </>
  )
}
